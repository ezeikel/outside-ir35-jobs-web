import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { ScrapedJob } from '../scrapers/jobserve.js';

/**
 * IR35 signals the classifier may assign to a SCRAPED listing. Deliberately
 * restricted to what a third-party listing can honestly support:
 *   - CLIENT_INTENDS_OUTSIDE: the listing itself states "outside IR35" (the
 *     SOURCE's claim, which we attribute — not our assertion).
 *   - INSIDE: the listing states "inside IR35".
 *   - UNKNOWN: anything ambiguous / unstated — THE DEFAULT.
 * The richer signals (SDS_ISSUED, SMALL_CLIENT_EXEMPT, CONTRACT_REVIEW_HELD)
 * require poster attestation we don't have from a scrape, so they're excluded.
 */
const ScrapedIr35Signal = z.enum([
  'CLIENT_INTENDS_OUTSIDE',
  'INSIDE',
  'UNKNOWN',
]);

export const ClassificationSchema = z.object({
  // Default UNKNOWN unless the listing EXPLICITLY states its IR35 position.
  ir35Signal: ScrapedIr35Signal,
  // 0–100. How confident the model is in the ir35Signal. Surfaced in the UI;
  // low confidence must stay UNKNOWN, never be coerced to outside.
  confidence: z.number().int().min(0).max(100),
  // Day rate in GBP/day. [min, max] for a range, [n] for a single rate, [] if
  // none stated. Never invent a rate.
  dayRate: z.array(z.number().int().positive()).max(2),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']).nullable(),
  contractLengthDays: z.number().int().positive().nullable(),
  // Cleaned location string (city/region or "Remote").
  location: z.string().nullable(),
  // Key technical/role skills mentioned (e.g. React, AWS, Terraform).
  skills: z.array(z.string()).max(20),
});

export type Classification = z.infer<typeof ClassificationSchema>;

const SYSTEM_PROMPT = `You classify UK contract job listings for an outside-IR35 job index.

CRITICAL RULE — you must NEVER assert a job's IR35 status yourself. Only the
end-client can determine IR35 status (via an SDS). You only report what the
LISTING states:
- If the listing EXPLICITLY says it is outside IR35, set ir35Signal =
  CLIENT_INTENDS_OUTSIDE (this records the SOURCE's claim, which we attribute).
- If the listing EXPLICITLY says inside IR35, set ir35Signal = INSIDE.
- In EVERY other case — ambiguous, unstated, or you're unsure — set ir35Signal =
  UNKNOWN. UNKNOWN is the correct, expected default. Do not guess "outside".

Set confidence to reflect how clearly the listing states its IR35 position
(high only when it is explicit). Extract day rate, work mode, contract length,
location and skills ONLY from what the text actually says — never invent values.
Use null / empty arrays when a field isn't stated.`;

/**
 * Classify + extract structured fields from one scraped listing with Claude
 * Sonnet (not Opus — cron cost). Returns null on model/parse failure so one bad
 * listing doesn't abort the batch.
 */
export const classifyJob = async (
  job: ScrapedJob,
): Promise<Classification | null> => {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: ClassificationSchema,
      system: SYSTEM_PROMPT,
      prompt:
        `Title: ${job.position}\n` +
        `Company: ${job.companyName}\n` +
        `Location: ${job.location}\n` +
        `Day rate (raw): ${job.dayRateText}\n` +
        `Description: ${job.description}`,
    });
    return object;
  } catch (err) {
    console.error(`[classify] failed for "${job.position}":`, err);
    return null;
  }
};
