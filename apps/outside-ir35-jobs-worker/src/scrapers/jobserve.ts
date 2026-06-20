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

// Jobserve's search needs a real interaction (no usable direct query URL — a
// guessed one 404s to InvalidRequest.aspx) AND a cookie consent before results
// render. So we drive the public Job-Search page agentically.
const JOBSERVE_SEARCH_PAGE = 'https://www.jobserve.com/gb/en/Job-Search/';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scrape recent UK contract roles from Jobserve via Stagehand (agentic): accept
 * cookies → run a contract search → extract the result list. Capped at `limit`
 * (default 25) per run — logged, never silent. Returns attribution + short
 * extracts for the classifier; we don't store full job bodies.
 */
export const scrapeJobserve = async (limit = 25): Promise<ScrapedJob[]> => {
  const sh = await createStagehand();
  try {
    const page = sh.page;
    await page.goto(JOBSERVE_SEARCH_PAGE, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Cookie gate — results don't render until consent is given.
    try {
      await page.act(
        'If a cookie consent banner is shown, click "Allow essential cookies"',
      );
      await sleep(1500);
    } catch {
      // no banner / already accepted — continue
    }

    // Filter to CONTRACT roles by job TYPE (not a keyword search for the word
    // "contract", which returns permanent roles that merely mention it). Set the
    // contract/contract-type option, then run the search.
    await page.act(
      'Set the job type filter to "Contract" only (not Permanent), using the ' +
        'job type option in the search form, then run the search.',
    );
    await sleep(4000);

    const result = await page.extract({
      instruction:
        `Extract up to ${limit} job listings from the search results list. ` +
        'For each: the job title (position), the hiring company or recruitment ' +
        'agency name (use "Confidential" if not shown), the location, the ' +
        'day-rate or salary text exactly as shown, a SHORT one-or-two-sentence ' +
        'description snippet (NOT the full body), and the absolute URL linking ' +
        'to the full job listing.',
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

// Make the URL absolute + drop only the hash. We KEEP the query string — Jobserve
// job links carry the job id there (e.g. ?jid=...), so stripping it would break
// the link and collapse distinct jobs into one dedup key.
const normalizeSourceUrl = (raw: string): string => {
  try {
    const u = new URL(raw, 'https://www.jobserve.com');
    u.hash = '';
    return u.toString();
  } catch {
    return raw.trim();
  }
};
