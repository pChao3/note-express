import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import { openai, tools } from './config.js';
import { get_weather } from './config.js';

const upload = multer({ dest: 'uploads/' });

const router = new Router();

// router.post('/completions1', async (req, res) => {
//   const { messages } = req.body;
//   const data = await openai.chat.completions.create({
//     messages,
//     model: 'deepseek-chat',
//     stream: true,
//     tools,
//   });
//   res.set('Content-Type', 'text/event-stream');
//   res.set('Cache-Control', 'no-cache');
//   res.set('Connection', 'keep-alive');
//   for await (const chunk of data) {
//     const delta = chunk.choices[0].delta;
//     console.log(delta.tool_calls);
//     res.write(`data: ${JSON.stringify({ content: chunk.choices[0].delta.content })}\n\n`);
//   }
//   console.log('____________________-');

//   res.write('data: [DONE]\n\n');
//   res.end();
// });
router.post('/completions', async (req, res) => {
  const { messages } = req.body;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    async function getCompletion(currentMessages) {
      const stream = await openai.chat.completions.create({
        messages: currentMessages,
        model: 'deepseek-chat',
        stream: true,
        tools,
      });

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
          return getCompletion(currentMessages);
        }
      }
    }

    await getCompletion(messages);
    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Streaming Error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
  } finally {
    res.end();
  }
});

// 模拟本地函数执行
async function executeFunction(name, args) {
  // 根据 config.js 里的 tools 定义进行逻辑匹配
  if (name === 'get_weather') {
    return await get_weather(args.location);
  }
  return { status: 'success' };
}

router.post('/asr', upload.single('file'), async (req, res) => {
  try {
    const audioPath = req.file.path;

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'gpt-4o-transcribe', // 或 whisper-1
      language: 'zh',
    });

    fs.unlinkSync(audioPath);

    res.json({
      text: transcription.text,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ASR failed' });
  }
});
export default router;
