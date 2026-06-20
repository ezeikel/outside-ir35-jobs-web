import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import { normalizeSkills, type ParsedProfile } from './profile-text.js';

/**
 * Parse a contractor CV (PDF or image) into a structured profile with Claude,
 * using its NATIVE document/image input — no PDF library, no OCR. The bytes go
 * straight to the model as a file content part.
 *
 * HONESTY + PII: a parsed profile is the CONTRACTOR'S OWN stated facts (skills,
 * roles) — never a platform judgement and NOTHING to do with IR35 status (see
 * docs/ir35-trust-model.md). We extract COMPETENCY only and deliberately DO NOT
 * extract identity PII (name, email, phone, address) — those aren't needed for
 * matching and minimising them is the right default for stored parsed data.
 */

const ParsedProfileSchema = z.object({
  headline: z
    .string()
    .nullable()
    .describe("A short professional summary in the CV's own words, or null."),
  seniority: z
    .string()
    .nullable()
    .describe('Self-described seniority (e.g. "Senior", "Lead"), or null.'),
  yearsExperience: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe('Total years of professional experience if stated/derivable.'),
  skills: z
    .array(z.string())
    .describe('Technical + professional skills named in the CV.'),
  experience: z
    .array(
      z.object({
        title: z.string(),
        company: z.string().nullable(),
        period: z
          .string()
          .nullable()
          .describe('Dates/duration as written, e.g. "2021-2023".'),
        summary: z
          .string()
          .nullable()
          .describe('One-line summary of the role.'),
      }),
    )
    .describe('Roles, most recent first.'),
  sectors: z
    .array(z.string())
    .describe('Industries/domains worked in, e.g. "fintech", "public sector".'),
});

const SYSTEM = `You extract a structured professional profile from a contractor's CV.

Extract ONLY what the CV actually states — never infer or embellish. Rules:
- Capture skills, roles, seniority, sectors and a short headline.
- DO NOT extract personal identifiers: no name, email, phone, address, date of
  birth, or nationality. We index competency, not identity.
- Make NO judgement about IR35 status, employability, or quality — you are
  transcribing the contractor's own stated facts, not assessing them.
- Use null / empty arrays for anything the CV does not state.`;

// Anthropic accepts PDFs via a 'file' part; images via an 'image' part. Map the
// upload mime type to the right content part.
const mediaPart = (bytes: Buffer, mimeType: string) => {
  if (mimeType === 'application/pdf') {
    return {
      type: 'file' as const,
      data: bytes,
      mediaType: 'application/pdf',
    };
  }
  return { type: 'image' as const, image: bytes, mediaType: mimeType };
};

/**
 * Parse CV bytes → ParsedProfile (skills normalized). Returns null on failure so
 * the caller can no-op without breaking the upload flow.
 */
export const parseCv = async (
  bytes: Buffer,
  mimeType: string,
): Promise<ParsedProfile | null> => {
  try {
    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-6'),
      schema: ParsedProfileSchema,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the structured profile from this CV.',
            },
            mediaPart(bytes, mimeType),
          ],
        },
      ],
    });

    return { ...object, skills: normalizeSkills(object.skills) };
  } catch (err) {
    console.error('[parse-cv] failed:', err);
    return null;
  }
};
