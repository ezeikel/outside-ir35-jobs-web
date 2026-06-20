import 'server-only';

import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

/**
 * Embed a seeker's free-text query into a 1536-dim vector with OpenAI
 * text-embedding-3-small — the SAME model the worker uses for job embeddings, so
 * query and jobs live in the same space (required for cosine search to mean
 * anything). Returns null on any failure so search degrades to filters-only
 * rather than throwing.
 */
export const embedQuery = async (text: string): Promise<number[] | null> => {
  const value = text.trim();
  if (!value) return null;

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value,
    });
    return embedding;
  } catch {
    return null;
  }
};
