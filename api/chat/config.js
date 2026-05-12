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

export const ROUTER_PROMPT = `你是一个日记库检索路由专家。根据用户的自然语言问题，输出检索参数 JSON，不要任何解释。

## 数据库字段
- title: string（日记标题）
- weather: string（"sunny" | "rainy" | "cloudy" | "snowy"）
- mood: string（"happy" | "calm" | "sad" | "angry"）
- tag: string（关键词标签）
- content: string（日记正文）
- createTime: Date（记录时间，用 MongoDB 查询格式，如 { $gte: ISODate, $lte: ISODate }）

## 检索策略
- filter: 用户只关心结构化属性（如"所有晴天日记"、"心情开心的日记"、"上周的日记"）
- vector: 用户描述抽象感受或具体事件（如"关于遗憾的回忆"、"快乐的时光"），无结构属性限制
- hybrid: 用户既指定结构属性又描述内容语义（如"晴天里开心的事情"、"上个月关于旅行的记录"）

## 输出格式（严格 JSON）
{
  "searchType": "filter | vector | hybrid",
  "filters": { /* 仅 filter/hybrid 时填写，MongoDB 查询对象，不需要时省略 */ },
  "vectorQuery": "用于向量搜索的语义文本（仅 vector/hybrid 时填写，提炼自用户问题的核心语义）"
}

## 示例
用户："帮我找上周心情开心的日记"
→ { "searchType": "hybrid", "filters": { "mood": "happy", "createTime": { "$gte": "<上周一ISO>", "$lte": "<上周日ISO>" } }, "vectorQuery": "心情开心 快乐" }

用户："关于遗憾的回忆"
→ { "searchType": "vector", "vectorQuery": "遗憾 回忆 后悔" }

用户："所有下雨天的日记"
→ { "searchType": "filter", "filters": { "weather": "rainy" } }`;

export const RAG_SYSTEM_PROMPT = `你是用户的私人日记助手。你只能基于提供的【日记片段】来回答用户问题。

规则：
1. 只引用提供的日记内容，不要编造或添加不存在的信息
2. 回答要自然、有温度，像一个了解用户的朋友
3. 如果日记片段中没有足够信息，诚实告知用户
4. 可以适当引用日记原文来支撑回答`;
