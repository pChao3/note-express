const reranked = async (query, document) => {
  try {
    const res = await fetch('https://dashscope.aliyuncs.com/compatible-api/v1/reranks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen3-rerank',
        top_n: Math.min(document.length, 5),
        documents: document.map(i =>
          typeof i === 'string' ? i : `${i.title || ''} ${i.content || ''}`.trim()
        ),
        query: typeof query === 'string' ? query : JSON.stringify(query),
        return_documents: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Rerank] API error:', res.status, errText);
      throw new Error(`Rerank API error: ${res.status}`);
    }

    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error('[Rerank] error:', error.message);
    throw error;
  }
};

export default reranked;
