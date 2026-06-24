import type { ScrapedJob } from './types.js';

export type { ScrapedJob };

/**
 * Adzuna source — a clean JSON API, not a scrape. We pull GB CONTRACT roles from
 * the Adzuna search API (no browser, no anti-bot), map each result to a
 * ScrapedJob, and feed the shared classify → embed → ingest pipeline.
 *
 * Honesty guards (mirror the never-assert + honest-rate rules):
 *  - We attribute the listing's own salary ONLY when Adzuna says it is NOT
 *    predicted (`salary_is_predicted`). Adzuna's predicted/estimated figures are
 *    Adzuna's guess, not the listing's claim — we never present those as a rate.
 *  - Adzuna salaries are ANNUAL. We do NOT turn an annual figure into a day rate
 *    here; we hand the classifier the raw "£X per year" text and it leaves
 *    dayRate [] for an annual salary (only genuine per-day/per-hour rates become
 *    a day rate). So Adzuna mostly contributes listings + search coverage, and a
 *    day rate only when the listing's own text states one.
 *  - ir35Signal stays whatever the classifier honestly reads (UNKNOWN default).
 */

const ADZUNA_BASE = 'https://api.adzuna.com/v1/api/jobs/gb/search';
const RESULTS_PER_PAGE = 50; // Adzuna's max per page

// The subset of the Adzuna result shape we rely on. All optional — the API
// omits fields when absent, so we read defensively.
export type AdzunaResult = {
  id?: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  // Adzuna returns this as the string "0" / "1" (sometimes a boolean) — treat
  // truthily so a predicted salary is never shown as the listing's rate.
  salary_is_predicted?: string | boolean;
  // contract_type = "contract" | "permanent" (the engagement); contract_time =
  // "full_time" | "part_time" (the hours). We filter on contract_type.
  contract_type?: string;
  contract_time?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
};

const stripHtml = (s: string): string =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const isPredicted = (r: AdzunaResult): boolean =>
  r.salary_is_predicted === '1' || r.salary_is_predicted === true;

/**
 * Build the raw rate text for the classifier from a result's salary, ONLY when
 * the figure is real (not predicted). Adzuna salaries are annual → we label them
 * "per year" so the classifier knows NOT to derive a day rate from them. Returns
 * '' when there's no real salary (predicted or absent).
 */
export const adzunaRateText = (r: AdzunaResult): string => {
  if (isPredicted(r)) return '';
  const min =
    typeof r.salary_min === 'number' ? Math.round(r.salary_min) : null;
  const max =
    typeof r.salary_max === 'number' ? Math.round(r.salary_max) : null;
  if (min == null && max == null) return '';
  const fmt = (n: number) => `£${n.toLocaleString('en-GB')}`;
  if (min != null && max != null && max !== min) {
    return `${fmt(min)} - ${fmt(max)} per year`;
  }
  return `${fmt((min ?? max) as number)} per year`;
};

/**
 * Map one Adzuna result to a ScrapedJob, or null if it lacks the essentials
 * (title + a redirect_url to link back to). Pure + unit-tested.
 */
export const mapAdzunaResult = (r: AdzunaResult): ScrapedJob | null => {
  const position = (r.title ? stripHtml(r.title) : '').trim();
  const sourceUrl = (r.redirect_url ?? '').split('#')[0].trim();
  if (!position || !/^https?:\/\//.test(sourceUrl)) return null;

  const companyName = r.company?.display_name?.trim() || 'See listing';
  const location = r.location?.display_name?.trim() || '';
  const dayRateText = adzunaRateText(r);
  const snippet = r.description ? stripHtml(r.description) : '';
  // Short extract only (index, not re-publish): rate + title + snippet.
  const description = [position, dayRateText, snippet]
    .filter(Boolean)
    .join(' — ')
    .slice(0, 480);

  return {
    position,
    companyName,
    location,
    dayRateText,
    description,
    sourceUrl,
  };
};

/**
 * Pure: turn an Adzuna API payload (one page) into ScrapedJobs, keeping only
 * CONTRACT roles (defensive — we request contract_time=contract, but double
 * check) and de-duping by sourceUrl.
 */
export const parseAdzunaPage = (
  payload: { results?: AdzunaResult[] },
  seen: Set<string> = new Set(),
): ScrapedJob[] => {
  const out: ScrapedJob[] = [];
  for (const r of payload.results ?? []) {
    // Defensive: the request already filters contract=1, but skip anything the
    // API marks as a non-contract engagement (contract_type, NOT contract_time).
    if (r.contract_type && r.contract_type !== 'contract') continue;
    const job = mapAdzunaResult(r);
    if (!job) continue;
    if (seen.has(job.sourceUrl)) continue;
    seen.add(job.sourceUrl);
    out.push(job);
  }
  return out;
};

/**
 * Fetch GB contract jobs from the Adzuna API and return ScrapedJobs. Pages until
 * `limit` is reached or results run out. Requires ADZUNA_APP_ID + ADZUNA_APP_KEY.
 */
export const scrapeAdzuna = async (limit = 25): Promise<ScrapedJob[]> => {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    console.warn('[adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set — skipping');
    return [];
  }

  const jobs: ScrapedJob[] = [];
  const seen = new Set<string>();
  const maxPages = Math.ceil(limit / RESULTS_PER_PAGE) + 1;

  for (let page = 1; page <= maxPages && jobs.length < limit; page += 1) {
    const url =
      `${ADZUNA_BASE}/${page}?app_id=${encodeURIComponent(appId)}` +
      `&app_key=${encodeURIComponent(appKey)}` +
      `&results_per_page=${RESULTS_PER_PAGE}` +
      // contract=1 is Adzuna's contract-engagement filter (contract_time is the
      // hours field and is NOT a valid filter — passing it 400s).
      `&contract=1` +
      `&max_days_old=14`;

    let payload: { results?: AdzunaResult[] };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        console.warn(`[adzuna] page ${page} HTTP ${res.status}`);
        break;
      }
      payload = (await res.json()) as { results?: AdzunaResult[] };
    } catch (err) {
      console.error(`[adzuna] page ${page} fetch failed:`, err);
      break;
    }

    const pageJobs = parseAdzunaPage(payload, seen);
    if (pageJobs.length === 0) break; // no more results
    jobs.push(...pageJobs);
  }

  const capped = jobs.slice(0, limit);
  console.info(
    `[adzuna] fetched ${capped.length} contract listings (cap ${limit})`,
  );
  return capped;
};
