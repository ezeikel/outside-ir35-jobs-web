import 'server-only';
import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { z } from 'zod';

// Claude Sonnet for prose quality + strong instruction-following (the honesty
// constraint below is load-bearing). Same model as the job-spec writer.
const MATCH_MODEL = 'claude-sonnet-4-6';

// The subset of the contractor's parsed CV we feed the model — real, stated facts.
export type MatchProfile = {
  headline?: string | null;
  seniority?: string | null;
  yearsExperience?: number | null;
  skills?: string[];
  experience?: {
    title: string;
    company?: string | null;
    period?: string | null;
    summary?: string | null;
  }[];
  sectors?: string[];
};

export type MatchJob = {
  position: string;
  companyName: string;
  description: string; // HTML or text; we strip tags in the prompt
  keywords?: string[];
  dayRate?: number[];
  location?: string | null;
};

export type MatchAndPitch = {
  whyMatched: string[]; // 2–4 short bullets, each grounded in a CV fact
  pitch: string; // a short cover note, plain text
};

const ResultSchema = z.object({
  whyMatched: z
    .array(z.string())
    .min(1)
    .max(4)
    .describe(
      '2–4 short bullets explaining why this role fits, EACH grounded in a specific skill or experience from the CV. No generic filler.',
    ),
  pitch: z
    .string()
    .describe(
      'A concise first-person cover note (~80–130 words) the contractor could send, using ONLY facts present in their CV.',
    ),
});

const SYSTEM = `You help a UK limited-company contractor understand why a contract role fits them and draft a short pitch.

ABSOLUTE RULES — never break these:
- Use ONLY facts present in the contractor's CV profile. NEVER invent skills, employers, years of experience, certifications, or projects they didn't state. If the CV is thin, write a shorter, honest pitch — do not pad it with fabricated experience.
- "Why matched" bullets must each cite a concrete CV fact (a named skill, a role, a sector) and connect it to the listing. No vague claims like "great communicator" unless the CV states it.
- The pitch is first-person, professional British English, concise, no hype, no emoji. It may reference the role and the contractor's relevant real experience. Do NOT claim the role is "outside IR35" or make any IR35/tax/legal claim — that's the client's determination.
- Plain text for the pitch (no markdown, no HTML).`;

const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000);

const profileText = (p: MatchProfile): string => {
  const lines = [
    p.headline ? `Headline: ${p.headline}` : '',
    p.seniority ? `Seniority: ${p.seniority}` : '',
    p.yearsExperience ? `Years of experience: ${p.yearsExperience}` : '',
    p.skills?.length ? `Skills: ${p.skills.join(', ')}` : '',
    p.sectors?.length ? `Sectors: ${p.sectors.join(', ')}` : '',
    ...(p.experience ?? []).slice(0, 6).map((e) => {
      const bits = [e.title, e.company, e.period].filter(Boolean).join(' · ');
      return `- ${bits}${e.summary ? `: ${e.summary}` : ''}`;
    }),
  ].filter(Boolean);
  return lines.join('\n');
};

export const generateMatchAndPitch = async (
  profile: MatchProfile,
  job: MatchJob,
): Promise<MatchAndPitch> => {
  const jobLines = [
    `Role: ${job.position}`,
    `Company: ${job.companyName}`,
    job.location ? `Location: ${job.location}` : '',
    job.keywords?.length ? `Listed skills: ${job.keywords.join(', ')}` : '',
    `Description: ${stripHtml(job.description)}`,
  ].filter(Boolean);

  const { object } = await generateObject({
    model: anthropic(MATCH_MODEL),
    schema: ResultSchema,
    system: SYSTEM,
    prompt: `CONTRACTOR CV PROFILE (the only facts you may use about them):\n${profileText(profile)}\n\nCONTRACT LISTING:\n${jobLines.join('\n')}`,
  });

  return object;
};
