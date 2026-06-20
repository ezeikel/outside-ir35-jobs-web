/**
 * The honesty validator for AI-generated blog posts. This is LOAD-BEARING: the
 * one product rule is that we NEVER assert IR35 status (see
 * docs/ir35-trust-model.md). A blog post is just another surface where that rule
 * applies — so every generated post is run through this validator BEFORE it is
 * written to Sanity. A failing post is rejected (thrown), never published.
 *
 * Pure + unit-tested. The system prompt (generate.ts) tells the model these
 * rules; this validator is the backstop that catches anything that slips
 * through — defence in depth, exactly like the never-assert rule deserves.
 */

// The data-backed gate: a day-rate / market-rate post may only be published if
// the underlying benchmark has at least this many distinct jobs. Mirrors
// apps/web/lib/benchmarks/compute.ts MIN_SAMPLE — kept in sync by hand (the
// worker can't import the web app). DO NOT lower to manufacture thin content.
export const MIN_SAMPLE = 5;

/**
 * Phrases that must NEVER appear as a platform assertion. These are the exact
 * forbidden claims from the trust model — saying any of them is the platform
 * making an IR35 determination it has no authority to make. "easi" is here
 * because EASI was abolished (the regulator is now the Fair Work Agency); citing
 * it signals stale, un-rechecked IR35 knowledge.
 */
export const FORBIDDEN_PHRASES = [
  'verified outside ir35',
  'guaranteed outside ir35',
  'guarantee outside ir35',
  'ir35-compliant',
  'ir35 compliant',
  'we verify',
  'we determine',
  'we guarantee',
  'easi', // abolished regulator — guidance must cite the Fair Work Agency
];

// A stable fragment of the required IR35-guidance disclaimer. The generated
// disclaimer may vary in wording around it, but must contain this phrase.
export const DISCLAIMER_FRAGMENT =
  'does not determine, verify, or warrant ir35 status';

// Words that, near an assertion of "outside IR35", make it an attributed CLAIM
// rather than a platform assertion.
const ATTRIBUTION_WORDS = ['client', 'states', 'claims', 'intends', 'listing'];

// Matches an ASSERTION that a specific role/contract IS outside IR35 — a
// role/engagement noun, then a copula/placement verb, then "outside (the )IR35".
// Does NOT match conceptual mentions ("the phrase outside IR35", "outside IR35
// status", "what outside IR35 means").
const ASSERTS_OUTSIDE =
  /\b(role|roles|contract|contracts|position|positions|engagement|engagements|assignment|assignments|job|jobs|it|this|these|they)\b[^.]{0,40}?\b(is|are|sits?|falls?|remains?|stays?|sit|fall)\b[^.]{0,20}?\boutside\s+(the\s+)?ir35\b/i;

export type Violation =
  | { kind: 'forbidden_phrase'; phrase: string }
  | { kind: 'missing_disclaimer' }
  | { kind: 'missing_attribution'; paragraph: string }
  | { kind: 'data_backed_no_data'; sampleCount: number };

export type ValidatePostInput = {
  // The generated post body as markdown.
  markdown: string;
  // True when the topic is IR35 guidance (requires the disclaimer).
  isIr35Guidance: boolean;
  // True when the topic is data-backed (day-rate/market) and must clear the gate.
  dataBacked: boolean;
  // Total distinct-job sample count behind the data this post used (0 if none).
  benchmarkSampleCount: number;
};

const splitParagraphs = (md: string): string[] =>
  md
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Validate a generated post against the honesty rules. Returns ok=false with the
 * specific violations so the caller can reject + log them (never publish).
 */
export const validatePost = (
  input: ValidatePostInput,
): { ok: boolean; violations: Violation[] } => {
  const violations: Violation[] = [];
  const lower = input.markdown.toLowerCase();

  // 1. Forbidden platform-assertion phrases.
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lower.includes(phrase)) {
      violations.push({ kind: 'forbidden_phrase', phrase });
    }
  }

  // 2. IR35-guidance posts must carry the never-assert disclaimer.
  if (input.isIr35Guidance && !lower.includes(DISCLAIMER_FRAGMENT)) {
    violations.push({ kind: 'missing_disclaimer' });
  }

  // 3. A paragraph that ASSERTS a specific role/contract is outside IR35 must
  //    attribute it (client states/claims/intends) — an unattributed assertion
  //    reads as OUR determination. We only flag assertion patterns ("the role
  //    is/sits/falls outside IR35", "this contract is outside IR35"), NOT
  //    conceptual discussion of the term ("what outside IR35 means", "the phrase
  //    outside IR35", "outside IR35 status"). Headings are titles, also exempt.
  for (const para of splitParagraphs(input.markdown)) {
    if (/^#{1,6}\s/.test(para)) continue; // skip markdown headings
    if (ASSERTS_OUTSIDE.test(para)) {
      const attributed = ATTRIBUTION_WORDS.some((w) =>
        para.toLowerCase().includes(w),
      );
      if (!attributed) {
        violations.push({ kind: 'missing_attribution', paragraph: para });
      }
    }
  }

  // 4. Data-backed posts must clear the sample-size gate (honest stats only).
  if (input.dataBacked && input.benchmarkSampleCount < MIN_SAMPLE) {
    violations.push({
      kind: 'data_backed_no_data',
      sampleCount: input.benchmarkSampleCount,
    });
  }

  return { ok: violations.length === 0, violations };
};
