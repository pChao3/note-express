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

export const ROUTER_PROMPT = `
  你是一个日记库检索专家。你的任务是将用户的自然语言查询转换为检索参数。
  #目标：根据用户的问题返回格式化JSON

  数据库里的数据格式为对象数组：
  {
    title:string
    weather:string sunny/rainy
    mood:string calm/happy
    tag:string
    content:string
    contentEmbedding:Array // content内容的矢量化数据
    createTime:new Date() // 日记的记录时间
  }
  ## 请根据用户输入语义来判断输出格式

  检索策略定义：
   filter: 仅当用户只关心属性（如“所有的晴天日记”）时使用。
   vector: 仅当用户描述抽象感受或具体事件（如“关于遗憾的回忆”）且未提天气/心情时使用。
   hybrid: 用户既指定了属性又描述了内容时使用。

  请输出 JSON，不要解释。

  字段说明：
  - searchType: vector / filter / hybrid
  - embeddingTarget: contentEmbedding 
  - filters: 可能包含 title,createTime, weather,mood, tag
`;
