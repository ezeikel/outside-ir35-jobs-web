import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { DayRateBenchmark } from './benchmarks.js';
import type { TopicResearch } from './research.js';
import type { BlogTopic } from './topics.js';

export const BLOG_MODEL = 'claude-sonnet-4-6';

// Remove em-dashes (a tell of AI prose) — chunky-crayon parity.
const stripEmDashes = (s: string): string =>
  s.replace(/\s*—\s*/g, ', ').replace(/—/g, ', ');

// ---- meta (title / slug / excerpt) ----

// NOTE: length limits are in .describe() (guidance), NOT hard .max() — a hard
// zod max makes generateObject FAIL the whole call if the model runs a few chars
// over. We enforce the caps by truncating in code below.
const metaSchema = z.object({
  title: z.string().describe('Compelling, specific, 6-12 words. No clickbait.'),
  slug: z
    .string()
    .describe(
      'url-safe-slug-in-kebab-case, derived from the title, max 80 chars',
    ),
  excerpt: z
    .string()
    .describe('1-2 sentence summary for SEO + previews, <=200 chars.'),
  metaDescription: z.string().describe('SEO meta description, <=160 chars.'),
  keywords: z.array(z.string()).describe('5-8 SEO keywords.'),
});

export type BlogMeta = z.infer<typeof metaSchema>;

// Truncate at a word boundary, appending an ellipsis if cut.
const cap = (s: string, max: number): string => {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

const META_SYSTEM = `You write SEO metadata for a UK outside-IR35 contractor blog.
NEVER write "verified outside IR35", "guaranteed outside IR35", or
"IR35-compliant" — the platform cannot determine IR35 status. Titles describe or
explain; they never assert a status claim.`;

export const generateMeta = async (topic: BlogTopic): Promise<BlogMeta> => {
  const { object } = await generateObject({
    model: anthropic(BLOG_MODEL),
    schema: metaSchema,
    system: META_SYSTEM,
    prompt:
      `Write metadata for a blog post on: "${topic.topic}".\n` +
      `Keywords: ${topic.keywords.join(', ')}.`,
  });
  return {
    ...object,
    title: stripEmDashes(object.title),
    excerpt: cap(stripEmDashes(object.excerpt), 200),
    metaDescription: cap(stripEmDashes(object.metaDescription), 160),
    keywords: object.keywords.slice(0, 8),
  };
};

// ---- content (markdown body) ----

const contentSchema = z.object({
  markdown: z
    .string()
    .describe('The full article body in markdown (## headings, lists, links).'),
  wordCount: z.number().int().positive(),
});

export type BlogContent = z.infer<typeof contentSchema>;

// The honesty-hardened system prompt. These rules are LOAD-BEARING — the
// validator (validator.ts) is the backstop, but the prompt must do the work.
const CONTENT_SYSTEM = `You write for outsideir35jobs.com, a UK contractor job board.

ABSOLUTE RULES — no exceptions:
1. NEVER write "verified outside IR35", "guaranteed outside IR35", or
   "IR35-compliant" as a statement of fact. The platform has NO authority to
   determine IR35 status — only the end client can, via a Status Determination
   Statement (SDS).
2. When describing a role's IR35 position, ATTRIBUTE it: "the client states...",
   "the listing claims...". Never present "outside IR35" as our own assertion. Any
   sentence mentioning "outside IR35" must make clear it is the client's claim.
3. CEST results are "not determinative" (HMRC's own position). An SDS or contract
   review is "evidence provided by the client", never platform verification.
4. The employment-rights regulator is the Fair Work Agency (FWA). NEVER mention
   EASI (abolished). For mutuality-of-obligation / status reasoning, lead on
   substitution and control (reflecting PGMOL), not "there is no MOO".
5. Cite primary gov.uk / HMRC sources for any guidance, as markdown links. Never
   state a platform legal conclusion.
6. Write in clear, practical British English for limited-company contractors. Use
   ## and ### headings, short paragraphs, and lists. 700-1100 words. No emojis.
   Do not use em-dashes.

When the topic is IR35 guidance, the FINAL paragraph MUST be exactly this
disclaimer (verbatim):
"This platform does not determine, verify, or warrant IR35 status; the SDS is the
client's legal responsibility. Contractors should take their own advice and
consider IR35 insurance."`;

export const generateContent = async (input: {
  topic: BlogTopic;
  research: TopicResearch | null;
  benchmarks: DayRateBenchmark[];
  isIr35Guidance: boolean;
}): Promise<BlogContent> => {
  const researchBlock = input.research
    ? `\n\nRESEARCH (use these current facts + cite the sources as links):\n` +
      `Summary: ${input.research.summary}\n` +
      `Key facts:\n${input.research.keyFacts.map((f) => `- ${f}`).join('\n')}\n` +
      `Sources:\n${input.research.sources.map((s) => `- ${s.title}: ${s.url}`).join('\n')}`
    : '\n\n(No external research available — write from general principles and cite gov.uk where you can.)';

  const benchmarkBlock =
    input.topic.dataBacked && input.benchmarks.length > 0
      ? `\n\nLIVE DAY-RATE DATA from this board (use ONLY these numbers for any rate figures; ` +
        `frame as "as of today, across N live contracts on this board"; never present a rate as IR35 guidance):\n` +
        input.benchmarks
          .map(
            (b) =>
              `- ${b.skill} [${b.ir35Bucket}]: median £${b.median}/day (p25 £${b.p25}, p75 £${b.p75}), ${b.sampleSize} contracts`,
          )
          .join('\n')
      : '';

  const guidanceNote = input.isIr35Guidance
    ? '\n\nThis is an IR35-GUIDANCE post: attribute every IR35-status mention to the client, and END with the exact disclaimer paragraph.'
    : '';

  const { object } = await generateObject({
    model: anthropic(BLOG_MODEL),
    schema: contentSchema,
    system: CONTENT_SYSTEM,
    prompt:
      `Write the blog post: "${input.topic.topic}".\n` +
      `Keywords to weave in naturally: ${input.topic.keywords.join(', ')}.` +
      researchBlock +
      benchmarkBlock +
      guidanceNote,
  });

  return { ...object, markdown: stripEmDashes(object.markdown) };
};
