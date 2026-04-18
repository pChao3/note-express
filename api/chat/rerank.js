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
        top_n: 3,
        documents: document.map(i => JSON.stringify(i)),
        query: JSON.stringify(query),
      }),
    });

    if (!res.ok) {
      throw new Error(`Rerank API error: ${res.status}`);
    }

    const data = await res.json();
    return data.results;
  } catch (error) {
    console.error('Rerank error:', error.message);
    throw new Error('Failed to rerank documents');
  }
};

export default reranked;
