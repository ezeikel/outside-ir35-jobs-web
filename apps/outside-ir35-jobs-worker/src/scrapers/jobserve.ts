import { z } from 'zod';
import { createStagehand } from '../browser.js';

// A raw scraped listing — attribution + a SHORT extract only. We are an INDEX,
// not a re-publisher: we store the sourceUrl + a brief description, never the
// full job body. The classifier reads `description` to extract structured fields.
export type ScrapedJob = {
  position: string;
  companyName: string;
  location: string;
  dayRateText: string; // raw, e.g. "£500 - £600 per day" — parsed downstream
  description: string; // short extract, not the full body
  sourceUrl: string; // canonical link back to the origin listing
};

const LISTING_SCHEMA = z.object({
  jobs: z.array(
    z.object({
      position: z.string(),
      companyName: z.string(),
      location: z.string(),
      dayRateText: z.string(),
      description: z.string(),
      sourceUrl: z.string(),
    }),
  ),
});

// Jobserve contract-only search (UK, contract roles). The query params keep this
// to contract listings; we read the public search results page.
const JOBSERVE_SEARCH_URL =
  'https://www.jobserve.com/gb/en/JobSearch.aspx?shid=1&q=&jtype=Contract';

/**
 * Scrape recent UK contract roles from Jobserve via Stagehand. Capped at `limit`
 * (default 25) per run — logged, never silent. Returns attribution + short
 * extracts for the classifier; we don't store full job bodies.
 */
export const scrapeJobserve = async (limit = 25): Promise<ScrapedJob[]> => {
  const sh = await createStagehand();
  try {
    const page = sh.page;
    await page.goto(JOBSERVE_SEARCH_URL, { waitUntil: 'domcontentloaded' });

    // Stagehand extracts the visible result list into our typed schema. We ask
    // for a SHORT description (the search-result snippet), not the full body, and
    // the canonical per-listing URL for attribution + dedup.
    const result = await page.extract({
      instruction:
        `Extract up to ${limit} contract job listings from the search results. ` +
        'For each: the job title (position), the hiring company or agency name ' +
        '(use "Confidential" if hidden), the location, the day-rate text exactly ' +
        'as shown, a SHORT one-or-two-sentence description snippet (not the full ' +
        'body), and the absolute URL that links to the full listing.',
      schema: LISTING_SCHEMA,
    });

    const jobs = result.jobs.slice(0, limit).map((j) => ({
      position: j.position.trim(),
      companyName: (j.companyName || 'Confidential').trim(),
      location: j.location.trim(),
      dayRateText: j.dayRateText.trim(),
      description: j.description.trim(),
      sourceUrl: normalizeSourceUrl(j.sourceUrl),
    }));

    console.info(
      `[jobserve] scraped ${jobs.length} listings (cap ${limit})` +
        (result.jobs.length > limit
          ? ` — ${result.jobs.length} available, truncated`
          : ''),
    );

    // Drop anything without a usable sourceUrl (can't attribute or dedup it).
    return jobs.filter((j) => j.sourceUrl.startsWith('http') && j.position);
  } finally {
    await sh.close();
  }
};

// Make the URL absolute + strip tracking/query noise so the same listing always
// dedups to one sourceUrl.
const normalizeSourceUrl = (raw: string): string => {
  try {
    const u = new URL(raw, 'https://www.jobserve.com');
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return raw.trim();
  }
};
