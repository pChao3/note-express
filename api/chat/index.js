import { Router } from 'express';
import {
  openai,
  tools,
  get_weather,
  ANALYSIS_PROMPT,
  RAG_SYSTEM_PROMPT,
  getQWResponse,
} from './config.js';
import { getQueryRouter } from './utils.js';

const router = new Router();

router.post('/completions', async (req, res) => {
  const { messages, askRAG } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let msg = [...messages];

    if (askRAG && msg.length > 0) {
      const userMessage = msg[msg.length - 1].content;
      console.log('[RAG] mode ON, query:', userMessage);

      let ragResults = [];
      try {
        ragResults = await getQueryRouter(userMessage);
      } catch (ragErr) {
        // RAG 失败时降级为普通回答，打印完整错误便于排查
        console.error('[RAG] getQueryRouter failed:', ragErr);
      }

      console.log('[RAG] results count:', ragResults.length);

      if (ragResults.length > 0) {
        const formattedDiaries = ragResults
          .map((item, idx) => {
            const date = item.createTime
              ? new Date(item.createTime).toLocaleDateString('zh-CN')
              : '未知日期';
            const parts = [
              `【日记 ${idx + 1}】`,
              `时间：${date}`,
              item.title ? `标题：${item.title}` : null,
              item.mood ? `心情：${item.mood}` : null,
              item.weather ? `天气：${item.weather}` : null,
              item.tag ? `标签：${item.tag}` : null,
              `内容：${item.content}`,
            ].filter(Boolean);
            return parts.join('\n');
          })
          .join('\n\n');

        console.log('[RAG] formatted context (first 200 chars):', formattedDiaries.slice(0, 200));

        // 注入 system 角色（若不存在）
        const hasSystem = msg[0]?.role === 'system';
        if (!hasSystem) {
          msg = [{ role: 'system', content: RAG_SYSTEM_PROMPT }, ...msg];
        }

        // 找到最后一条 user 消息（兼容旧版 Node 不支持 findLastIndex）
        let lastUserIdx = -1;
        for (let i = msg.length - 1; i >= 0; i--) {
          if (msg[i].role === 'user') { lastUserIdx = i; break; }
        }

        if (lastUserIdx !== -1) {
          msg[lastUserIdx] = {
            role: 'user',
            content: `以下是与问题相关的日记片段：\n\n${formattedDiaries}\n\n---\n用户问题：${userMessage}`,
          };
          console.log('[RAG] injected context into message index', lastUserIdx);
        }
      } else {
        console.log('[RAG] no results found, falling back to normal response');
      }
    }

    await getCompletion(msg, res);
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('[Completion] error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
  } finally {
    res.end();
  }
});

async function getCompletion(currentMessages, res) {
  const stream = await getQWResponse({ messages: currentMessages, stream: true, tools });
  const fullToolCalls = [];

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;
    const finishReason = chunk.choices[0].finish_reason;

    if (delta.content) {
      res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
    }

    if (delta.tool_calls) {
      for (const toolCall of delta.tool_calls) {
        const index = toolCall.index;
        if (!fullToolCalls[index]) {
          fullToolCalls[index] = { id: toolCall.id, name: '', arguments: '' };
        }
        if (toolCall.id) fullToolCalls[index].id = toolCall.id;
        if (toolCall.function?.name) fullToolCalls[index].name = toolCall.function.name;
        if (toolCall.function?.arguments) {
          fullToolCalls[index].arguments += toolCall.function.arguments;
        }
      }
    }

    if (finishReason === 'tool_calls') {
      currentMessages.push({
        role: 'assistant',
        tool_calls: fullToolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      for (const tc of fullToolCalls) {
        const result = await executeFunction(tc.name, JSON.parse(tc.arguments));
        currentMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
      return getCompletion(currentMessages, res);
    }
  }
}

async function executeFunction(name, args) {
  if (name === 'get_weather') {
    return await get_weather(args.location);
  }
  return { status: 'success' };
}

const callQwenASR = async audioBase64 => {
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
            input_audio: { data: cleanBase64, format: 'webm' },
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

    const transcribedText = await callQwenASR(audioData);

    const analysisResponse = await getQWResponse({
      messages: [
        { role: 'system', content: ANALYSIS_PROMPT },
        { role: 'user', content: transcribedText },
      ],
      response_format: { type: 'json_object' },
    });

    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content);

    res.json({
      msg: 'ok',
      status: 200,
      text: transcribedText,
      data: analysisResult,
    });
  } catch (error) {
    console.error('[ASR Error]:', error.message);
    res.status(500).json({
      msg: error.message || 'Internal Server Error',
      status: 500,
    });
  }
});

export default router;
