import 'server-only';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

// Read the structured facts off a compliance document (insurance certificate,
// certificate of incorporation) with Claude's native PDF/image input — the SAME
// approach as the CV parser (apps/worker/src/cv/parse-cv.ts). This is a
// TRANSCRIPTION AID: we extract what the document plainly states so the contractor
// doesn't have to type it, then THEY confirm it. It is NOT verification and must
// never be surfaced as "verified by AI" — only "we read this off your document,
// check it's right" (docs/ir35-trust-model.md). We extract only the fields the
// upload form needs (insurer, cover limit, expiry) — no identity PII.

const MODEL = 'claude-sonnet-4-6';

const ExtractSchema = z.object({
  insurer: z
    .string()
    .nullable()
    .describe(
      'The insurer / underwriter name as printed on the certificate (e.g. "Hiscox", "Markel"). Null if not an insurance document or not stated.',
    ),
  coverLimit: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      'The limit of indemnity / cover limit in WHOLE POUNDS (e.g. 1000000 for £1m). Null if not stated or not an insurance document.',
    ),
  expiresAt: z
    .string()
    .nullable()
    .describe(
      'The expiry / renewal / "valid until" date as ISO yyyy-mm-dd. For a date range, use the END date. Null if not stated.',
    ),
});

export type ExtractedDocFacts = z.infer<typeof ExtractSchema>;

const SYSTEM = `You read a UK contractor's compliance document and extract ONLY the facts plainly printed on it.

Rules:
- Extract insurer name, limit of indemnity (cover limit, in whole pounds), and the expiry/renewal date — ONLY if the document actually states them.
- Convert money to a whole-pound integer: "£1,000,000" → 1000000, "£5m" → 5000000.
- Convert any date to ISO yyyy-mm-dd. For a "period of insurance" range, take the END date.
- Use null for anything the document does not clearly state. NEVER guess or infer a value that isn't printed.
- Make NO judgement about validity, sufficiency, or IR35 — you are transcribing printed facts, not assessing them.`;

const mediaPart = (bytes: Buffer, mimeType: string) =>
  mimeType === 'application/pdf'
    ? { type: 'file' as const, data: bytes, mediaType: 'application/pdf' }
    : { type: 'image' as const, image: bytes, mediaType: mimeType };

/**
 * Extract {insurer, coverLimit, expiresAt} from a document. Returns all-null on
 * failure so the caller can fall back to manual entry without breaking the flow.
 */
export const extractDocFacts = async (
  bytes: Buffer,
  mimeType: string,
): Promise<ExtractedDocFacts> => {
  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: ExtractSchema,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract the insurer, cover limit and expiry date from this document.',
            },
            mediaPart(bytes, mimeType),
          ],
        },
      ],
    });
    return object;
  } catch (err) {
    console.error('[extractDocFacts] failed:', err);
    return { insurer: null, coverLimit: null, expiresAt: null };
  }
};
