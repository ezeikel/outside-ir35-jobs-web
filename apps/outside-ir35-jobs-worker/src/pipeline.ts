import { classifyJob } from './classify/classify.js';
import { prefilter } from './classify/prefilter.js';
import { embedJob } from './embed.js';
import { ingestJob } from './ingest.js';
import { scrapeAdzuna } from './scrapers/adzuna.js';
import { scrapeCwjobs } from './scrapers/cwjobs.js';
import { scrapeJobserve } from './scrapers/jobserve.js';
import type { ScrapedJob } from './scrapers/types.js';

export type AggregationResult = {
  source: string;
  scraped: number;
  prefiltered: number;
  classified: number;
  ingested: number;
  created: number;
};

// A scraper is just `(limit) => ScrapedJob[]`. The pipeline below is fully
// source-agnostic — add a source by writing a scraper of this shape and a thin
// wrapper that names it.
export type Scraper = (limit: number) => Promise<ScrapedJob[]>;

/**
 * The source-agnostic aggregation pipeline: scrape → keyword pre-filter → Claude
 * classify/extract → embed → upsert as AGGREGATED. Each listing is handled
 * independently — one failure doesn't abort the run. Pass any scraper.
 */
export const runAggregation = async (
  source: string,
  scrape: Scraper,
  opts?: { limit?: number },
): Promise<AggregationResult> => {
  const limit = opts?.limit ?? 25;
  const result: AggregationResult = {
    source,
    scraped: 0,
    prefiltered: 0,
    classified: 0,
    ingested: 0,
    created: 0,
  };

  const jobs = await scrape(limit);
  result.scraped = jobs.length;

  for (const job of jobs) {
    const gate = prefilter(job);
    if (!gate.keep) continue;
    result.prefiltered += 1;

    const cls = await classifyJob(job);
    if (!cls) continue;
    result.classified += 1;

    const embedding = await embedJob({
      position: job.position,
      skills: cls.skills,
      description: job.description,
    });

    try {
      const { created } = await ingestJob(job, cls, embedding);
      result.ingested += 1;
      if (created) result.created += 1;
    } catch (err) {
      console.error(`[pipeline] ingest failed for ${job.sourceUrl}:`, err);
    }
  }

  console.info(`[pipeline] ${source} run complete:`, result);
  return result;
};

// --- per-source wrappers -----------------------------------------------------

export const runJobserveAggregation = (opts?: { limit?: number }) =>
  runAggregation('jobserve', scrapeJobserve, opts);

export const runCwjobsAggregation = (opts?: { limit?: number }) =>
  runAggregation('cwjobs', scrapeCwjobs, opts);

export const runAdzunaAggregation = (opts?: { limit?: number }) =>
  runAggregation('adzuna', scrapeAdzuna, opts);

// Blog generation lives in src/blog; re-exported here for discoverability.
export { runBlogCron } from './blog/cron.js';
