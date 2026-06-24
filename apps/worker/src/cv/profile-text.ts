/**
 * Pure helpers for the parsed contractor profile: normalize the extracted skills
 * and build the text we embed for semantic contractor matching. Kept pure +
 * unit-tested — the embedding text directly drives match quality, and skill
 * normalization affects what's displayed.
 */

export type ParsedExperience = {
  title: string;
  company: string | null;
  // Free-text duration as written on the CV (e.g. "2021–2023", "18 months").
  period: string | null;
  summary: string | null;
};

export type ParsedProfile = {
  // A short professional summary (contractor-supplied, from the CV).
  headline: string | null;
  // Self-described seniority (e.g. "Senior", "Lead") — NOT a platform judgement.
  seniority: string | null;
  // Total years of experience if stated/derivable, else null.
  yearsExperience: number | null;
  skills: string[];
  experience: ParsedExperience[];
  // Sectors/domains worked in (e.g. "fintech", "public sector").
  sectors: string[];
};

/**
 * Normalize a raw skill list: trim, drop blanks, collapse whitespace, de-dupe
 * case-insensitively (keeping the first-seen casing), and cap the count. Keeps
 * the displayed/embedded skills tidy without altering the contractor's terms.
 */
export const normalizeSkills = (skills: string[], max = 40): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of skills) {
    const skill = raw.replace(/\s+/g, ' ').trim();
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= max) break;
  }
  return out;
};

/**
 * Build the text embedded for semantic contractor↔job matching. Weighted by
 * repetition-free concatenation of the signal-bearing fields (skills, headline,
 * titles, sectors). Deliberately excludes PII (name/email/address) — we embed
 * COMPETENCY, not identity.
 */
export const profileEmbeddingText = (profile: ParsedProfile): string => {
  const parts: string[] = [];
  if (profile.headline) parts.push(profile.headline);
  if (profile.seniority) parts.push(profile.seniority);
  if (profile.skills.length) parts.push(profile.skills.join(', '));
  for (const exp of profile.experience) {
    parts.push(
      [exp.title, exp.company, exp.summary].filter(Boolean).join(' — '),
    );
  }
  if (profile.sectors.length) parts.push(profile.sectors.join(', '));
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
};
