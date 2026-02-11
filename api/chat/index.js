import { Router } from 'express';
import {
  openai,
  tools,
  get_weather,
  ANALYSIS_PROMPT,
  ROUTER_PROMPT,
  getQWResponse,
} from './config.js';
import { getQueryRouter } from './utils.js';

const router = new Router();

router.post('/completions', async (req, res) => {
  const { messages, askRAG } = req.body;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let msg = messages;
    if (askRAG) {
      const mesg = msg[msg.length - 1].content;
      const res = await getQueryRouter(mesg);
      console.log('res', res);
      //
      if (res.length) {
        const prompt = `
             已知资料：${JSON.stringify(res)}
            基于资料回答问题，不要编造。
            问题：${mesg}
            `;
        msg = [...msg, { role: 'user', content: prompt }];
      }
    }
    await getCompletion(msg, res);
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.log('error', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
  } finally {
    res.end();
  }
});

async function getCompletion(currentMessages, res) {
  const stream = await getQWResponse({ messages: currentMessages, stream: true, tools });
  let fullToolCalls = []; // 用于累积所有的 tool calls

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;
    const finishReason = chunk.choices[0].finish_reason;

    // 1. 处理文本内容
    if (delta.content) {
      res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
    }

    // 2. 累积 Tool Calls 数据 (分段传输的)
    if (delta.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;
        if (!fullToolCalls[index]) {
          fullToolCalls[index] = { id: toolCall.id, name: '', arguments: '' };
        }
        if (toolCall.id) fullToolCalls[index].id = toolCall.id;
        if (toolCall.function?.name) fullToolCalls[index].name = toolCall.function.name;
        if (toolCall.function?.arguments)
          fullToolCalls[index].arguments += toolCall.function.arguments;
      }
    }

    // 3. 当 finish_reason 为 tool_calls 时，说明函数调用参数收集完毕
    if (finishReason === 'tool_calls') {
      // 将助手的这次函数调用意图放入上下文
      currentMessages.push({
        role: 'assistant',
        tool_calls: fullToolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      // 执行本地函数
      for (const tc of fullToolCalls) {
        const result = await executeFunction(tc.name, JSON.parse(tc.arguments));
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      // 递归调用：把执行结果传回大模型，获取最终回复
      return getCompletion(currentMessages, res);
    }
  }
}

// 模拟本地函数执行
async function executeFunction(name, args) {
  // 根据 config.js 里的 tools 定义进行逻辑匹配
  if (name === 'get_weather') {
    return await get_weather(args.location);
  }
  return { status: 'success' };
}

const callQwenASR = async audioBase64 => {
  // 健壮性检查：确保 Base64 是纯净的数据部分
  const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

  const completion = await openai.chat.completions.create({
    model: 'qwen3-asr-flash',
    messages: [
      { role: 'system', content: [{ text: '你是一个精准的语音转文字助手' }] },
      {
        role: 'user',
        content: [
          {
            type: 'input_audio',
            input_audio: { data: cleanBase64, format: 'webm' }, // 建议明确格式
          },
        ],
      },
    ],
  });

  const text = completion.choices[0].message.content;
  if (!text || text.trim().length === 0) {
    throw new Error('语音内容为空，请重试');
  }
  return text;
};

router.post('/asr', async (req, res) => {
  try {
    const { audioData } = req.body;
    if (!audioData) {
      return res.status(400).json({ msg: 'Missing audioData', status: 400 });
    }

    // 1. 语音转文字
    const transcribedText = await callQwenASR(audioData);

    // 2. 结构化分析 (使用 qwen-plus)
    const analysisResponse = await getQWResponse({
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: transcribedText },
      ],
      response_format: { type: 'json_object' },
    });

    // 3. 安全解析 JSON
    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content);

    res.json({
      msg: 'ok',
      status: 200,
      text: transcribedText,
      data: analysisResult,
    });
  } catch (error) {
    console.error('[ASR Error]:', error);
    res.json({
      msg: error.message || 'Internal Server Error',
      status: 500,
    });
  }
});

export default router;
