import { createStagehand } from '../browser.js';

// A raw scraped listing — attribution + a SHORT extract only. We are an INDEX,
// not a re-publisher: we store the sourceUrl + a brief description, never the
// full job body. The classifier reads these to extract structured fields.
export type ScrapedJob = {
  position: string;
  companyName: string;
  location: string;
  dayRateText: string; // raw, e.g. "£500pd inside IR35" — parsed downstream
  description: string; // short extract, not the full body
  sourceUrl: string; // canonical link back to the origin listing
};

const JOBSERVE_SEARCH_PAGE = 'https://www.jobserve.com/gb/en/Job-Search/';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Scrape recent UK CONTRACT roles from Jobserve.
 *
 * Jobserve is an Angular SPA whose search results come from a JSON web service
 * (`/WebServices/JobSearch.asmx/RetrieveJobs`) returning an HTML fragment of
 * `.jobItem` divs, each with a stable id + title/salary/location/type. We drive
 * the page just enough to trigger that call (cookie consent → Job Type = Contract
 * → search), CAPTURE the response, and parse the fragment DETERMINISTICALLY — far
 * more reliable than visual/LLM extraction, and it gives us the canonical job id
 * for the sourceUrl.
 */
export const scrapeJobserve = async (limit = 25): Promise<ScrapedJob[]> => {
  const sh = await createStagehand();
  let retrieveJobsBody = '';
  try {
    const page = sh.page;

    // Capture the RetrieveJobs JSON response as it fires.
    page.on('response', async (res) => {
      if (/RetrieveJobs/i.test(res.url())) {
        try {
          retrieveJobsBody = await res.text();
        } catch {
          // ignore — we validate below
        }
      }
    });

    await page.goto(JOBSERVE_SEARCH_PAGE, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Cookie gate — the search won't run until consent is given.
    try {
      await page.act(
        'If a cookie consent banner is shown, click "Allow essential cookies"',
      );
      await sleep(1500);
    } catch {
      // no banner / already accepted
    }

    // Job Type defaults to "Permanent" — flip it to Contract (custom dropdown,
    // label "Job Type", options as .bb-custom-select-option divs), then search.
    await page.act('Click the "Job Type" dropdown to open it');
    await sleep(800);
    await page.act('Click the "Contract" option in the open Job Type dropdown');
    await sleep(800);
    await page.act('Run the job search');
    await sleep(5000);

    if (!retrieveJobsBody) {
      console.warn('[jobserve] no RetrieveJobs response captured');
      return [];
    }

    const jobs = parseRetrieveJobs(retrieveJobsBody).slice(0, limit);
    console.info(
      `[jobserve] scraped ${jobs.length} contract listings (cap ${limit})`,
    );
    return jobs;
  } finally {
    await sh.close();
  }
};

// --- deterministic parsing of the RetrieveJobs HTML fragment -----------------

const JOBSERVE_ORIGIN = 'https://www.jobserve.com';

// Decode the minimal HTML entities Jobserve emits in the fragment.
const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&pound;/g, '£')
    .replace(/&nbsp;/g, ' ')
    .trim();

const field = (block: string, cls: string): string => {
  const m = block.match(
    new RegExp(`<[^>]*class="${cls}"[^>]*>([\\s\\S]*?)<\\/`, 'i'),
  );
  return m ? decode(m[1].replace(/<[^>]+>/g, '')) : '';
};

/**
 * Parse the `{ "d": "<div class='jobItem' id=...>..." }` fragment into typed
 * listings. Only KEEPS jobs whose type is Contract (defensive — the search is
 * already contract-filtered, but we double-check). The job id → canonical URL.
 */
export const parseRetrieveJobs = (responseBody: string): ScrapedJob[] => {
  let html = '';
  try {
    const parsed = JSON.parse(responseBody) as { d?: string };
    html = parsed.d ?? '';
  } catch {
    return [];
  }
  if (!html) return [];

  const items = [
    ...html.matchAll(
      /<div class="jobItem" id="([^"]+)">([\s\S]*?)(?=<div class="jobItem"|$)/g,
    ),
  ];

  const out: ScrapedJob[] = [];
  for (const [, id, block] of items) {
    const position = field(block, 'jobResultsTitle');
    if (!position) continue;
    const type = field(block, 'jobResultsType');
    // Defensive: only contract roles (search is already filtered, but be sure).
    if (type && !/contract/i.test(type)) continue;

    const dayRateText = field(block, 'jobResultsSalary');
    const location = field(block, 'jobResultsLoc');

    out.push({
      position,
      companyName: 'Confidential', // not in the result fragment (detail page only)
      location,
      dayRateText,
      // The search fragment has no body; title + rate are the extract the
      // classifier reads. We never store a full job body (index, not re-publish).
      description: `${position}${dayRateText ? ` — ${dayRateText}` : ''}${location ? ` (${location})` : ''}`,
      sourceUrl: `${JOBSERVE_ORIGIN}/gb/en/search-result/?id=${id}`,
    });
  }
  return out;
};
