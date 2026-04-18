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

export const getQueryRouter = async query => {
  try {
    const res = await getQWResponse({
      messages: [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: query },
      ],
      response_format: { type: 'json_object' },
    });

    const router = JSON.parse(res.choices[0].message.content);
    let results = [];
    console.log('router',router)

    if (router.searchType === 'filter') {
      results = await NewNote.find(router.filters, { contentEmbedding: 0, __v: 0 });
    }

    if (router.searchType === 'vector') {
      results = await searchSimilar(query, router.embeddingTarget);
    }

    return results;
  } catch (error) {
    console.error('Query router error:', error.message);
    return [];
  }
};

export const searchSimilar = async (query, path, k = 10) => {
  const queryEmbedding = await embed(query);
  console.log('[Vector Search] path:', path, 'queryEmbedding length:', queryEmbedding?.length);

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
        similarityScore: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  console.log('[Vector Search] results count:', results.length);
  if (results.length === 0) {
    return [];
  }

  const rankList = await reranked(query, results);
  console.log('[Rerank] rankList:', rankList.map(r => ({ index: r.index, score: r.relevance_score })));

  const filtered = rankList.filter(item => item.relevance_score >= 0.75);
  console.log('[Rerank] filtered count:', filtered.length);

  return filtered.map(item => results[item.index]);
};
