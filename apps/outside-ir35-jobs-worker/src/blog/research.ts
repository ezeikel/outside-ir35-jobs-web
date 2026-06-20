import { perplexity } from '@ai-sdk/perplexity';
import { generateObject } from 'ai';
import { z } from 'zod';
import type { BlogTopic } from './topics.js';

/**
 * Grounded research for a blog topic via Perplexity `sonar` (citation-backed).
 *
 * Why Perplexity and not Claude-only: IR35 guidance ages fast (the regulator is
 * now the Fair Work Agency, not EASI; PGMOL shifted the MOO analysis) and we must
 * cite PRIMARY gov.uk/HMRC sources rather than assert our own conclusions. Sonar
 * searches live and returns sources we can attribute. Non-fatal: returns null on
 * failure so the pipeline can still generate from the topic + our own data.
 */

const researchSchema = z.object({
  summary: z
    .string()
    .describe(
      'A neutral 2-4 sentence factual summary of the current position.',
    ),
  keyFacts: z
    .array(z.string())
    .max(10)
    .describe(
      'Specific, current, sourced facts a writer can use. No opinions.',
    ),
  sources: z
    .array(z.object({ title: z.string(), url: z.string() }))
    .max(8)
    .describe('Primary sources, gov.uk/HMRC first where relevant.'),
  sourcesCheckedAt: z
    .string()
    .describe('ISO date these sources were checked (today).'),
});

export type TopicResearch = z.infer<typeof researchSchema>;

const SYSTEM = `You are a research assistant for a UK contractor job board's blog.
Return ONLY current, verifiable facts with sources. Rules:
- Prioritise PRIMARY sources: gov.uk, HMRC, legislation.gov.uk, official case law.
- IR35 / off-payroll knowledge ages fast. The employment-rights regulator is now
  the Fair Work Agency (FWA) — do NOT reference EASI (abolished). For
  employment-status / mutuality-of-obligation reasoning, reflect the PGMOL
  decision (substitution + control over "no MOO").
- Capture publication / last-updated dates where you can.
- Do NOT make legal determinations or recommendations; just report the position
  and cite it. Never claim a role can be "verified outside IR35".`;

export const researchTopic = async (
  topic: BlogTopic,
  todayIso: string,
): Promise<TopicResearch | null> => {
  try {
    const { object } = await generateObject({
      model: perplexity('sonar'),
      schema: researchSchema,
      system: SYSTEM,
      prompt:
        `Research this topic for a UK outside-IR35 contractor audience: "${topic.topic}".\n` +
        `Relevant keywords: ${topic.keywords.join(', ')}.\n` +
        `Today's date is ${todayIso}; set sourcesCheckedAt to that. Return current facts + primary sources.`,
    });
    return object;
  } catch (err) {
    console.error(`[blog-research] failed for "${topic.topic}":`, err);
    return null;
  }
};
