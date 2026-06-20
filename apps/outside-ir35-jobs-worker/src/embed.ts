import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

/**
 * Embed a job into a 1536-dim vector with OpenAI text-embedding-3-small (matches
 * the jobs.embedding vector(1536) column). Used for semantic search later.
 * Returns null on failure so ingest can still persist the row without an embedding.
 */
export const embedJob = async (input: {
  position: string;
  skills: string[];
  description: string;
}): Promise<number[] | null> => {
  const value = [input.position, input.skills.join(', '), input.description]
    .filter(Boolean)
    .join('\n');

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value,
    });
    return embedding;
  } catch (err) {
    console.error('[embed] failed:', err);
    return null;
  }
};
