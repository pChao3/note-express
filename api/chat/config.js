import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '../../.env' });
export const openai = new OpenAI({
  //   baseURL: 'https://api.deepseek.com',
  //   apiKey: process.env.DEEPSEEK_API_KEY,
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export const getQWResponse = async option => {
  const res = await openai.chat.completions.create({
    model: 'qwen-plus',
    ...option,
  });
  return res;
};
export const tools = [
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '当你想查询指定城市的天气时非常有用。',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: '城市或县区，比如北京市、杭州市、余杭区等。',
          },
        },
        required: ['location'],
      },
    },
  },
];

export const get_weather = async cityName => {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${process.env.WEATHER_KEY}&units=metric&lang=zh_cn`
  ).then(res => res.json());
  console.log('res', res);
  return res;
};

// 抽取 Prompt 模板，便于维护
export const ANALYSIS_PROMPT = `你是一个专业的文字总结情感分析师。
请直接分析提供的文字，并以 JSON 格式输出。
请你站在我的角度去对这些吐槽字段进行总结概括.
不要使用“描述了”、“这是一段”等总结性词汇。
心情（mood）仅限：happy 或 calm。

输出 JSON 结构：
{
  "mood": "happy/calm",
  "title": "5-10字的简短标题",
  "tag": "核心关键词",
  "content": "概括总结"
}`;
