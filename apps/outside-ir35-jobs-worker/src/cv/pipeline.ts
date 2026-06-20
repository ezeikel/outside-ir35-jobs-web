import { openai } from '@ai-sdk/openai';
import { db, Prisma } from '@outside-ir35-jobs/db';
import { get } from '@outside-ir35-jobs/storage';
import { embed } from 'ai';
import { parseCv } from './parse-cv.js';
import { profileEmbeddingText } from './profile-text.js';

export type CvParseResult = {
  status: 'parsed' | 'skipped';
  userId: string;
  skills?: number;
  embedded?: boolean;
  reason?: string;
};

/**
 * The CV-parsing pipeline: fetch the uploaded CV from R2 → parse with Claude
 * (native document input) → embed the competency text (OpenAI, same 1536-dim
 * space as jobs) → persist `parsedProfile` (Json) + `embedding` (raw ::vector) on
 * the user. Best-effort throughout: a failure leaves the user's existing profile
 * untouched and never throws to the caller.
 */
export const runCvParse = async (input: {
  userId: string;
  r2Key: string;
  mimeType: string;
}): Promise<CvParseResult> => {
  const { userId, r2Key, mimeType } = input;

  let bytes: Buffer;
  try {
    bytes = await get(r2Key);
  } catch (err) {
    console.error(`[cv-parse] failed to fetch ${r2Key}:`, err);
    return { status: 'skipped', userId, reason: 'fetch_failed' };
  }

  const profile = await parseCv(bytes, mimeType);
  if (!profile) {
    return { status: 'skipped', userId, reason: 'parse_failed' };
  }

  // Persist the structured profile (contractor-supplied facts).
  await db.user.update({
    where: { id: userId },
    data: { parsedProfile: profile as Prisma.InputJsonValue },
  });

  // Embed the competency text for semantic contractor↔job matching. Best-effort:
  // the parsed profile is already saved even if embedding fails.
  let embedded = false;
  const value = profileEmbeddingText(profile);
  if (value) {
    try {
      const { embedding } = await embed({
        model: openai.embedding('text-embedding-3-small'),
        value,
      });
      const vec = `[${embedding.join(',')}]`;
      await db.$executeRaw`UPDATE "users" SET "embedding" = ${vec}::vector WHERE "id" = ${userId}`;
      embedded = true;
    } catch (err) {
      console.error('[cv-parse] embed failed:', err);
    }
  }

  console.info(
    `[cv-parse] user ${userId}: ${profile.skills.length} skills, embedded=${embedded}`,
  );
  return {
    status: 'parsed',
    userId,
    skills: profile.skills.length,
    embedded,
  };
};
