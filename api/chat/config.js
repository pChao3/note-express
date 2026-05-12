import 'dotenv/config';
import OpenAI from 'openai';

export const openai = new OpenAI({
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
export const ANALYSIS_PROMPT = `你是一个情感与内容分析助手。
我会给你一段语音识别转写的文字，你需要基于这段文字完成以下三件事：
1. 判断心情（mood）：仅限 happy 或 calm
2. 提炼一个标题（title）：5-10字的简短标题
3. 提炼一个标签（tag）：一个核心关键词

【重要】content 字段必须是我提供给你的原始文字，一字不改地原样复制，禁止总结、概括、改写或删减。

以 JSON 格式输出，不要输出任何其他内容：
{
  "mood": "happy 或 calm",
  "title": "5-10字的标题",
  "tag": "核心关键词",
  "content": "原始输入文字（原样复制，不做任何修改）"
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
   filter: 仅当用户只关心属性（如"所有的晴天日记"）时使用。
   vector: 仅当用户描述抽象感受或具体事件（如"关于遗憾的回忆"）且未提天气/心情时使用。
   hybrid: 用户既指定了属性又描述了内容时使用。

  请输出 JSON，不要解释。

  字段说明：
  - searchType: vector / filter / hybrid
  - embeddingTarget: contentEmbedding 
  - filters: 可能包含 title,createTime, weather,mood, tag
`;
