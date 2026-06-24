import { withStagehand } from '../browser.js';
import type { ScrapedJob } from './types.js';

export type { ScrapedJob };

/**
 * Scrape recent UK CONTRACT roles from CWJobs.
 *
 * CWJobs (a Totaljobs/Stepstone skin) renders its contract search results
 * server-side as `[data-testid="job-item"]` cards, EACH of which carries — in
 * its visible text — the title, company, location, rate (e.g. "£60 per hour",
 * "£28,000 - £29,000 a year", or "Competitive") and a real description snippet.
 *
 * The per-job DETAIL pages live on totaljobs.com and are deliberately
 * HTTP/2-walled (they RST the stream; only list pages load), so we DON'T fetch
 * them — the list card already has everything the classifier needs. We drive the
 * page just enough to load results + accept cookies, pull each card's text +
 * canonical href via the DOM, and parse DETERMINISTICALLY (pure parser below,
 * unit-tested). The classifier then resolves company/location/rate from the
 * text; we keep the raw rate string for the prefilter + as a strong signal.
 */
const CWJOBS_CONTRACT_LIST = 'https://www.cwjobs.co.uk/jobs/contract';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// page.evaluate body as a STRING (not an arrow fn): tsx/esbuild injects a
// `__name` helper into transpiled closures that isn't defined in the page
// context, so a function reference throws "__name is not defined" in-page.
const CARDS_JS = `(() => {
  var items = Array.prototype.slice.call(
    document.querySelectorAll('[data-testid="job-item"]')
  );
  return items.map(function (el) {
    var titleA = el.querySelector('[data-testid="job-item-title"]');
    return {
      title: titleA ? titleA.innerText.trim() : '',
      href: titleA ? titleA.href : '',
      text: el.innerText.replace(/\\s+/g, ' ').trim(),
    };
  });
})()`;

export type RawCard = { title: string; href: string; text: string };

export const scrapeCwjobs = async (limit = 25): Promise<ScrapedJob[]> =>
  // Held under the global browser lock so it never collides with the jobserve
  // Browserbase session (1 concurrent session on plan → 429 otherwise).
  withStagehand(async (sh) => {
    const page = sh.page;
    await page.goto(CWJOBS_CONTRACT_LIST, { waitUntil: 'domcontentloaded' });
    await sleep(3000);

    // Cookie consent — accept so the results render fully.
    try {
      await page.act(
        'If a cookie consent banner is shown, accept or allow all cookies',
      );
      await sleep(1200);
    } catch {
      // no banner / already accepted
    }

    // CARDS_JS is a string body (not an arrow fn) — see its definition for why.
    const cards = (await page.evaluate(CARDS_JS)) as RawCard[];
    const jobs = parseCwjobsCards(cards).slice(0, limit);
    console.info(
      `[cwjobs] scraped ${jobs.length} contract listings (cap ${limit})`,
    );
    return jobs;
  });

// --- deterministic parsing of the CWJobs cards -------------------------------

const CWJOBS_ORIGIN = 'https://www.cwjobs.co.uk';

/**
 * The canonical, attributable source URL for a card. CWJobs cards link to a
 * totaljobs.com/job/<slug>-job<ID> detail page; we keep that exact URL as the
 * link-back (it IS the listing's canonical home), stripping any tracking query.
 * Falls back to the CWJobs origin if the href is missing/odd.
 */
export const canonicalSourceUrl = (href: string): string => {
  if (!href) return CWJOBS_ORIGIN;
  const noQuery = href.split('?')[0].split('#')[0];
  if (/^https?:\/\//.test(noQuery)) return noQuery;
  return `${CWJOBS_ORIGIN}${noQuery.startsWith('/') ? '' : '/'}${noQuery}`;
};

/**
 * Pull the raw rate phrase from a card's text, if present. Matches the formats
 * CWJobs uses: "£60 per hour", "£500 - £600 per day", "£28,000 - £29,000 a year",
 * "£450 a day", "Competitive". Returns '' when no rate is stated (the classifier
 * then leaves dayRate empty — never invents one).
 */
export const extractRateText = (text: string): string => {
  // A £-amount (optionally a range) followed by a period unit.
  const money = String.raw`£\s?[\d,]+(?:\.\d+)?(?:\s*[-–]\s*£?\s?[\d,]+(?:\.\d+)?)?`;
  const unit = String.raw`(?:per\s+hour|an?\s+hour|/\s?hr|per\s+day|a\s+day|/\s?day|p\/?d|per\s+annum|a\s+year|p\/?a)`;
  const ranged = new RegExp(`${money}\\s*${unit}`, 'i');
  const m = text.match(ranged);
  if (m) return m[0].replace(/\s+/g, ' ').trim();
  // Bare "Competitive" (no figure) — still a meaningful, honest signal.
  if (/\bcompetitive\b/i.test(text)) return 'Competitive';
  return '';
};

/**
 * Turn raw CWJobs cards into typed ScrapedJobs. DETERMINISTIC: title + href come
 * straight from the anchor; rate text via regex; the card text is the short
 * description extract (we index, not re-publish). company/location are left for
 * the classifier to resolve from the text (the card's company/location boundary
 * has no reliable delimiter) — so companyName is a placeholder here.
 *
 * Drops cards with no title or no usable link. Does NOT itself filter perm/annual
 * roles — that's the shared keyword prefilter's job downstream.
 */
export const parseCwjobsCards = (cards: RawCard[]): ScrapedJob[] => {
  const out: ScrapedJob[] = [];
  const seen = new Set<string>();

  for (const card of cards) {
    const position = (card.title || '').trim();
    if (!position) continue;
    const sourceUrl = canonicalSourceUrl(card.href);
    if (!sourceUrl || sourceUrl === CWJOBS_ORIGIN) continue; // need a real link-back
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);

    const fullText = (card.text || '').replace(/\s+/g, ' ').trim();
    const dayRateText = extractRateText(fullText);

    // Short extract only (index, not re-publish): cap the snippet. Keep the rate
    // visible at the front so the prefilter + classifier see it immediately.
    const description = fullText.slice(0, 480);

    out.push({
      position,
      companyName: 'See listing', // resolved by the classifier from the text
      location: '',
      dayRateText,
      description,
      sourceUrl,
    });
  }

  return out;
};
