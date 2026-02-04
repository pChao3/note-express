// src/utils/splitter.js
import embed from './embedding.js';
import NewNote from '../../database/models/newnote.js';
import reranked from './rerank.js';

export function splitText(text, size = 20, overlap = 5) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    chunks.push(text.slice(start, start + size));
    start += size - overlap;
  }

  return chunks;
}

// 根据输入查询相似度的矢量数据
export const searchSimilar = async (query, k = 10) => {
  // 将输入转为矢量数据
  const queryEmbedding = await embed(query);
  const results = await NewNote.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'embedding',
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
      },
    },
  ]);

  const rankList = await reranked(query, results);
  const highScore = rankList.reduce((prev, cur) => {
    if (cur.relevance_score >= 0.75) {
      prev.push(results[cur.index]);
    }
    return prev;
  }, []);
  return highScore;
};
