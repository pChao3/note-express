import { Router } from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
dotenv.config({ path: '../../.env' });
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const router = new Router();

router.post('/completions', async (req, res) => {
  const { messages } = req.body;
  const data = await openai.chat.completions.create({
    messages,
    model: 'deepseek-chat',
    stream: true,
  });
  res.set('Content-Type', 'text/event-stream');
  res.set('Cache-Control', 'no-cache');
  res.set('Connection', 'keep-alive');
  for await (const chunk of data) {
    res.write(`data: ${JSON.stringify({ content: chunk.choices[0].delta.content })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
});
export default router;
