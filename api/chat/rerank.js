const reranked = async (query, document) => {
  const res = await fetch('https://dashscope.aliyuncs.com/compatible-api/v1/reranks', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen3-rerank',
      top_n: 3,
      documents: document.map(i => JSON.stringify(i)),
      query: JSON.stringify(query),
    }),
  })
    .then(res => res.json())
    .catch(error => console.log(error));
  return res.results;
};

export default reranked;
