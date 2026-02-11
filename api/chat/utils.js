// src/utils/splitter.js
import embed from './embedding.js';
import NewNote from '../../database/models/newnote.js';
import reranked from './rerank.js';
import { getQWResponse, ROUTER_PROMPT } from './config.js';

export function splitText(text, size = 20, overlap = 5) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }

  return chunks;
}

// define query intent router
export const getQueryRouter = async query => {
  const res = await getQWResponse({
    messages: [
      { role: 'system', content: ROUTER_PROMPT },
      { role: 'user', content: query },
    ],
    response_format: { type: 'json_object' },
  });

  let results;
  const router = JSON.parse(res.choices[0].message.content);
  console.log('router', router);
  if (router.searchType === 'filter') {
    results = await NewNote.find(router.filters, { contentEmbedding: 0, __v: 0 });
  }

  if (router.searchType === 'vector') {
    results = await searchSimilar(query, router.embeddingTarget);
  }
  // todo: hybrid

  return results;
};

// 根据输入查询相似度的矢量数据
export const searchSimilar = async (query, path, k = 10) => {
  // 将输入转为矢量数据
  const queryEmbedding = await embed(query);
  const results = await NewNote.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: path,
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: k,
      },
    },
    {
      $project: {
        _id: 0,
        mood: 1,
        tag: 1,
        createTime: 1,
        weather: 1,
        content: 1,
        similarityScore: { $meta: 'vectorSearchScore' }, // 获取相似度分数
      },
    },
  ]);

  const rankList = await reranked(query, results);
  console.log(results, rankList);

  const highScore = rankList.reduce((prev, cur) => {
    if (cur.relevance_score >= 0.75) {
      prev.push(results[cur.index]);
    }
    return prev;
  }, []);
  return highScore;
};
