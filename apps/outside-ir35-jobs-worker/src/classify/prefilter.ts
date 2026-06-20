/**
 * Cheap keyword pre-filter run BEFORE the LLM, to skip listings that obviously
 * aren't relevant contract roles (saves classifier cost on high-volume crons —
 * per docs/ai-features.md "hybrid keyword pre-filter + LLM"). Pure + unit-tested.
 *
 * This is a RELEVANCE gate (is this a contract role we'd index?), NOT an IR35
 * decision — the never-assert rule means only the LLM classifier maps IR35
 * signal, and even then UNKNOWN is the default. We never mark a job "outside"
 * from keywords.
 */

const text = (j: { position: string; description: string }): string =>
  `${j.position} ${j.description}`.toLowerCase();

// Obvious non-fits: permanent roles, internships, etc. Contract boards still
// surface some of these, so drop them before spending an LLM call.
const EXCLUDE = [
  'permanent role',
  'perm role',
  'full-time permanent',
  'graduate scheme',
  'internship',
  'apprenticeship',
  'work experience',
  'volunteer',
];

// Signals that this really is a day-rate contract role worth classifying.
const INCLUDE = [
  'contract',
  'per day',
  'day rate',
  'daily rate',
  '/day',
  'p/d',
  'outside ir35',
  'inside ir35',
  'ir35',
  'limited company',
  'umbrella',
];

export type PrefilterResult = { keep: boolean; reason: string };

export const prefilter = (job: {
  position: string;
  description: string;
}): PrefilterResult => {
  const t = text(job);

  const excluded = EXCLUDE.find((k) => t.includes(k));
  if (excluded) return { keep: false, reason: `excluded: "${excluded}"` };

  const included = INCLUDE.find((k) => t.includes(k));
  if (!included) return { keep: false, reason: 'no contract/day-rate signal' };

  return { keep: true, reason: `matched: "${included}"` };
};
