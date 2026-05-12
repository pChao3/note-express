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

/**
 * 路由分发：根据 AI 判断的检索策略执行对应查询
 * - filter: MongoDB 结构化过滤
 * - vector: 纯向量语义搜索 + rerank
 * - hybrid: filter 缩小范围 + 在结果集内向量搜索 + rerank
 */
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
    console.log('[Router]', JSON.stringify(router));

    const { searchType, filters = {}, vectorQuery } = router;

    // ---------- filter ----------
    if (searchType === 'filter') {
      const results = await NewNote.find(filters, {
        contentEmbedding: 0,
        __v: 0,
      }).lean();
      // filter 结果也经过 rerank，确保相关性排序
      if (results.length === 0) return [];
      return rerankAndFilter(query, results);
    }

    // ---------- vector ----------
    if (searchType === 'vector') {
      const semanticQuery = vectorQuery || query;
      return searchSimilar(semanticQuery);
    }

    // ---------- hybrid ----------
    if (searchType === 'hybrid') {
      const semanticQuery = vectorQuery || query;

      // 先用 filter 拿到候选集（保留 embedding 用于向量排序）
      const filterQuery = Object.keys(filters).length > 0 ? filters : {};
      const candidates = await NewNote.find(filterQuery).lean();

      if (candidates.length === 0) {
        // filter 无结果时降级为纯向量搜索
        return searchSimilar(semanticQuery);
      }

      // 候选集足够大时直接 rerank；太大时先向量缩排
      if (candidates.length <= 20) {
        const stripped = candidates.map(({ contentEmbedding, __v, ...rest }) => rest);
        return rerankAndFilter(semanticQuery, stripped);
      }

      // 候选集超过 20：向量搜索限定在 filter 范围内
      return searchSimilarFromCandidates(semanticQuery, candidates);
    }

    // 兜底：直接向量搜索
    return searchSimilar(query);
  } catch (error) {
    console.error('[QueryRouter] error:', error.message);
    return [];
  }
};

/** rerank + 相关性阈值过滤 */
async function rerankAndFilter(query, docs, threshold = 0.5) {
  if (docs.length === 0) return [];
  try {
    const rankList = await reranked(query, docs);
    console.log('[Rerank] scores:', rankList.map(r => r.relevance_score.toFixed(3)));
    return rankList
      .filter(item => item.relevance_score >= threshold)
      .map(item => docs[item.index]);
  } catch {
    // rerank 失败时直接返回原列表
    return docs.slice(0, 5);
  }
}

/** 全库向量搜索 */
export const searchSimilar = async (query, k = 10) => {
  const queryEmbedding = await embed(query);

  const results = await NewNote.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'contentEmbedding',
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit: k,
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        mood: 1,
        tag: 1,
        createTime: 1,
        weather: 1,
        content: 1,
        similarityScore: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  console.log('[VectorSearch] count:', results.length);
  if (results.length === 0) return [];
  return rerankAndFilter(query, results, 0.5);
};

/**
 * 在指定候选集中进行向量相似度排序（hybrid 大候选集场景）
 * 利用 MongoDB $vectorSearch 的 filter 参数缩小搜索范围
 */
const searchSimilarFromCandidates = async (query, candidates) => {
  const queryEmbedding = await embed(query);
  const ids = candidates.map(c => c._id);

  const results = await NewNote.aggregate([
    {
      $vectorSearch: {
        index: 'vector_index',
        path: 'contentEmbedding',
        queryVector: queryEmbedding,
        numCandidates: 150,
        limit: 10,
        filter: { _id: { $in: ids } },
      },
    },
    {
      $project: {
        _id: 0,
        title: 1,
        mood: 1,
        tag: 1,
        createTime: 1,
        weather: 1,
        content: 1,
        similarityScore: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  if (results.length === 0) return [];
  return rerankAndFilter(query, results, 0.5);
};
