import { db, JobIR35Signal } from '@outside-ir35-jobs/db';
import { MIN_SAMPLE } from './validator.js';

/**
 * Day-rate benchmarks for the blog's data-backed posts. This runs the SAME
 * aggregation as the web app's getDayRateBenchmarks (apps/web/app/actions.ts) —
 * median day rate per skill × IR35 bucket, hard-gated on MIN_SAMPLE distinct
 * jobs. Kept in sync by hand (the worker can't import the web app); the gate is
 * the honest-stats rule, identical to /day-rates.
 */

// Mirrors apps/web/lib/search/filters.ts OUTSIDE_SIGNALS.
const OUTSIDE_SIGNALS: JobIR35Signal[] = [
  JobIR35Signal.CLIENT_INTENDS_OUTSIDE,
  JobIR35Signal.SDS_ISSUED,
  JobIR35Signal.CONTRACT_REVIEW_HELD,
  JobIR35Signal.SMALL_CLIENT_EXEMPT,
];

export type DayRateBenchmark = {
  skill: string;
  ir35Bucket: 'OUTSIDE' | 'INSIDE' | 'UNKNOWN';
  sampleSize: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
};

export const getDayRateBenchmarks = async (): Promise<DayRateBenchmark[]> => {
  return db.$queryRaw<DayRateBenchmark[]>`
    WITH job_rates AS (
      SELECT
        j.id,
        lower(trim(skill)) AS skill,
        CASE
          WHEN j."ir35Signal" = ANY(${OUTSIDE_SIGNALS}::"JobIR35Signal"[]) THEN 'OUTSIDE'
          WHEN j."ir35Signal" = 'INSIDE'::"JobIR35Signal" THEN 'INSIDE'
          ELSE 'UNKNOWN'
        END AS ir35_bucket,
        CASE
          WHEN array_length(j."dayRate", 1) >= 2
            THEN round((j."dayRate"[1] + j."dayRate"[array_upper(j."dayRate",1)]) / 2.0)
          ELSE j."dayRate"[1]
        END AS rate
      FROM "jobs" j
      CROSS JOIN LATERAL unnest(j."extractedSkills") AS skill
      WHERE j."isActive" = true
        AND array_length(j."dayRate", 1) >= 1
        AND trim(skill) <> ''
    )
    SELECT
      skill,
      ir35_bucket AS "ir35Bucket",
      count(DISTINCT id)::int AS "sampleSize",
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY rate))::int AS median,
      round(percentile_cont(0.25) WITHIN GROUP (ORDER BY rate))::int AS p25,
      round(percentile_cont(0.75) WITHIN GROUP (ORDER BY rate))::int AS p75,
      min(rate)::int AS min,
      max(rate)::int AS max
    FROM job_rates
    GROUP BY skill, ir35_bucket
    HAVING count(DISTINCT id) >= ${MIN_SAMPLE}
    ORDER BY count(DISTINCT id) DESC, median DESC`;
};

// Total distinct-job sample behind the benchmarks (the gate count the validator
// checks for data-backed posts).
export const totalBenchmarkSample = (rows: DayRateBenchmark[]): number =>
  rows.reduce((sum, r) => sum + r.sampleSize, 0);
