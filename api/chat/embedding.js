import { openai } from './config.js';
const embed = async text => {
  const completion = await openai.embeddings.create({
    input: text,
    model: 'text-embedding-v4',
  });
  return completion.data[0].embedding;
};

export default embed;
