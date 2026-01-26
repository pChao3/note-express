import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config({ path: '../../.env' });
export const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY,
});
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
