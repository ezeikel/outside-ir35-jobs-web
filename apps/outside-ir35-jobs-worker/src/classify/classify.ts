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
  // none stated. Never invent a rate. An HOURLY rate is converted to a day rate
  // (× 7.5h standard contractor day); an ANNUAL salary is NOT a day rate → [].
  dayRate: z.array(z.number().int().positive()).max(2),
  workMode: z.enum(['REMOTE', 'HYBRID', 'ON_SITE']).nullable(),
  contractLengthDays: z.number().int().positive().nullable(),
  // The hiring company / recruiter named in the listing, cleaned (e.g. "Certain
  // Advantage"). null if not clearly stated — never guess.
  companyName: z.string().nullable(),
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
(high only when it is explicit). Extract company name, day rate, work mode,
contract length, location and skills ONLY from what the text actually says —
never invent values. Use null / empty arrays when a field isn't stated. For
companyName, give the hiring company or recruiter as named (null if unclear).

DAY RATE — read carefully, our benchmarks depend on it being honest:
- If the rate is per DAY (e.g. "£500/day", "£500-£600 per day"), use it directly.
- If the rate is per HOUR (e.g. "£60 per hour"), CONVERT to a day rate by
  multiplying by 7.5 (a standard contractor working day): "£60 per hour" →
  dayRate [450]. For an hourly range, convert both ends.
- If only an ANNUAL salary is given (e.g. "£28,000 a year", "£50,000 - £70,000 a
  year"), that is NOT a day rate — leave dayRate EMPTY []. Do not divide a salary
  into a day rate; a salaried/annual posting is not a day-rate contract.
- "Competitive" or any non-numeric rate → dayRate [].
Always output dayRate in GBP per day as positive integers (round to the nearest £).`;

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
