import 'server-only';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

// Claude Sonnet drafts noticeably better prose than a small OpenAI model — same
// model the worker uses for the blog/CV pipeline (ANTHROPIC_API_KEY).
const DRAFT_MODEL = 'claude-sonnet-4-6';

/**
 * AI job-spec writer for posters. Takes rough inputs and drafts a clear, attractive
 * outside-IR35 contract spec. HONESTY (docs/ir35-trust-model.md) is load-bearing:
 * the model must NEVER assert the role IS outside IR35 or use banned phrases — only
 * the end-client can determine status. The poster states their IR35 position
 * separately via the form's attributed signal; the description must not pre-empt it.
 */

export type JobSpecInput = {
  position: string;
  skills?: string;
  notes?: string; // free-text the poster jotted down
  workMode?: string;
  dayRate?: string;
  location?: string;
};

export type JobSpecDraft = {
  description: string; // HTML (simple <p>/<ul>/<strong>)
  howToApply: string; // HTML
  keywords: string; // comma-separated
};

const DraftSchema = z.object({
  description: z
    .string()
    .describe(
      'The role description as simple HTML (only <p>, <ul>, <li>, <strong>). About the role, responsibilities, must-have skills, and contract context.',
    ),
  howToApply: z
    .string()
    .describe('Short how-to-apply instructions as simple HTML.'),
  keywords: z
    .string()
    .describe('5–10 comma-separated keywords/skills for search.'),
});

const SYSTEM = `You write contract job specifications for a UK outside-IR35 contract job board (limited-company / PSC contractors).

CRITICAL RULES — never break these:
- NEVER claim or imply the role IS outside IR35, "IR35-compliant", "verified outside IR35", or "guaranteed outside IR35". Only the end client can determine IR35 status via a Status Determination Statement. The poster states their IR35 position separately — your text must NOT pre-empt or assert it.
- You MAY say the role is advertised for limited-company contractors and describe the work, skills and contract context. Do NOT make tax or legal claims.
- Write in clear, professional British English. Be specific and concise; no fluff, no emoji, no hype.
- Output simple HTML only: <p>, <ul>, <li>, <strong>. No headings, scripts, styles or links.
- If given thin input, write a sensible, generic-but-useful spec — never invent specific company names, salaries, or false detail.`;

export const generateJobSpec = async (
  input: JobSpecInput,
): Promise<JobSpecDraft> => {
  const lines = [
    `Role title: ${input.position}`,
    input.skills ? `Key skills: ${input.skills}` : '',
    input.workMode ? `Work mode: ${input.workMode}` : '',
    input.dayRate ? `Day rate: ${input.dayRate}` : '',
    input.location ? `Location: ${input.location}` : '',
    input.notes ? `Notes from the hirer: ${input.notes}` : '',
  ].filter(Boolean);

  const { object } = await generateObject({
    model: anthropic(DRAFT_MODEL),
    schema: DraftSchema,
    system: SYSTEM,
    prompt: `Draft a contract job spec from these inputs:\n${lines.join('\n')}`,
  });

  return object;
};
