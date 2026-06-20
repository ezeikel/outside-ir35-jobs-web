import 'server-only';

import { openai } from '@ai-sdk/openai';
import { db as prisma } from '@outside-ir35-jobs/db';
import { embed } from 'ai';

/**
 * Embed a native (poster-created) job and write the vector to its pgvector column
 * via raw SQL (the column is Prisma-Unsupported). Mirrors what the aggregation
 * worker does for scraped jobs, so native + aggregated jobs share the same
 * embedding space and both appear in semantic search. Best-effort: a failure here
 * must not fail job creation, so it swallows errors (the job just won't rank in
 * semantic search until re-embedded).
 */
export const embedAndStoreJob = async (input: {
  id: string;
  position: string;
  keywords: string[];
  description: string;
}): Promise<void> => {
  const value = [input.position, input.keywords.join(', '), input.description]
    .filter(Boolean)
    .join('\n')
    .trim();
  if (!value) return;

  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value,
    });
    const vec = `[${embedding.join(',')}]`;
    await prisma.$executeRaw`UPDATE "jobs" SET "embedding" = ${vec}::vector WHERE "id" = ${input.id}`;
  } catch {
    // best-effort — don't block job creation on embedding
  }
};
