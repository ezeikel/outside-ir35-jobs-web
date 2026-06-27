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
  // The ContractorCV row being parsed. When present, the parse is written to that
  // CV row, and mirrored to the User profile/embedding ONLY if the CV is active
  // (the active CV drives matching). Omitted = legacy single-CV behaviour (always
  // writes the User profile).
  cvId?: string;
}): Promise<CvParseResult> => {
  const { userId, r2Key, mimeType, cvId } = input;

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

  // Persist the structured profile on the CV row itself (this CV's own parse).
  // Decide whether this CV drives the User profile: only the active one does.
  let drivesUser = true;
  if (cvId) {
    const cv = await db.contractorCV.update({
      where: { id: cvId },
      data: { parsedProfile: profile as Prisma.InputJsonValue },
      select: { isActive: true },
    });
    drivesUser = cv.isActive;
  }

  // The active CV (or legacy single CV) is the contractor's matching profile.
  if (drivesUser) {
    await db.user.update({
      where: { id: userId },
      data: { parsedProfile: profile as Prisma.InputJsonValue },
    });
  }

  // Embed the competency text for semantic contractor↔job matching. Best-effort:
  // the parsed profile is already saved even if embedding fails. Only the active
  // CV updates the user-level embedding used by recommendations/search.
  let embedded = false;
  const value = profileEmbeddingText(profile);
  if (drivesUser && value) {
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
