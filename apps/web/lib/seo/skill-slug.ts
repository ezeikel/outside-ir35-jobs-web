// Pure slug <-> skill helpers for /contracts/[skill] SEO pages. Skills are stored
// lowercased (e.g. "react", "node.js", "aws lambda"). The slug is URL-safe; we keep
// it reversible enough to round-trip back to the stored skill for the DB lookup.

// "node.js" → "node-js", "aws lambda" → "aws-lambda", "c#" → "c-sharp".
export const skillToSlug = (skill: string): string =>
  skill
    .trim()
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/#/g, '-sharp')
    .replace(/[.\s/]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

// Display name for a skill: title-case each word, but keep common acronyms upper.
const ACRONYMS = new Set([
  'aws',
  'gcp',
  'sql',
  'css',
  'html',
  'api',
  'ci',
  'cd',
  'ml',
  'ai',
  'devops',
  'php',
  'ios',
]);
export const skillDisplay = (skill: string): string =>
  skill
    .split(/\s+/)
    .map((w) =>
      ACRONYMS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');
