import { classifyJob } from './classify/classify.js';
import { prefilter } from './classify/prefilter.js';
import { embedJob } from './embed.js';
import { ingestJob } from './ingest.js';
import { scrapeJobserve } from './scrapers/jobserve.js';

export type AggregationResult = {
  scraped: number;
  prefiltered: number;
  classified: number;
  ingested: number;
  created: number;
};

/**
 * The Jobserve aggregation pipeline: scrape → keyword pre-filter → Claude
 * classify/extract → embed → upsert as AGGREGATED. Each listing is handled
 * independently — one failure doesn't abort the run.
 */
export const runJobserveAggregation = async (opts?: {
  limit?: number;
}): Promise<AggregationResult> => {
  const limit = opts?.limit ?? 25;
  const result: AggregationResult = {
    scraped: 0,
    prefiltered: 0,
    classified: 0,
    ingested: 0,
    created: 0,
  };

  const jobs = await scrapeJobserve(limit);
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

  console.info('[pipeline] jobserve run complete:', result);
  return result;
};
