import { JobIR35Signal } from '@outside-ir35-jobs/db/types';

/**
 * Pure logic for day-rate benchmarks. The honest-gating + rate math live here so
 * they're unit-tested — a benchmark off thin or mis-computed data would be as
 * dishonest as asserting IR35 status (see docs/ir35-trust-model.md).
 */

// A skill+IR35 stat is only shown once it has at least this many DISTINCT jobs.
// Keep honest — do NOT lower this to manufacture content on a thin board.
export const MIN_SAMPLE = 5;

// IR35 buckets for grouping. We never assert status; these mirror the listing's
// own signal (outside-leaning = the client's stated/evidenced claim).
export type Ir35Bucket = 'OUTSIDE' | 'INSIDE' | 'UNKNOWN';

const OUTSIDE_SIGNALS: JobIR35Signal[] = [
  JobIR35Signal.CLIENT_INTENDS_OUTSIDE,
  JobIR35Signal.SDS_ISSUED,
  JobIR35Signal.CONTRACT_REVIEW_HELD,
  JobIR35Signal.SMALL_CLIENT_EXEMPT,
];

export const ir35Bucket = (signal: string): Ir35Bucket => {
  if ((OUTSIDE_SIGNALS as string[]).includes(signal)) return 'OUTSIDE';
  if (signal === JobIR35Signal.INSIDE) return 'INSIDE';
  return 'UNKNOWN';
};

export const IR35_BUCKET_LABEL: Record<Ir35Bucket, string> = {
  OUTSIDE: 'Outside IR35 · per client',
  INSIDE: 'Inside',
  UNKNOWN: 'Not stated',
};

/**
 * A job's representative day rate from its `dayRate Int[]`:
 *   [n]      → n
 *   [min,max]→ midpoint (min+max)/2, rounded
 *   []/null  → null (no rate; excluded from stats)
 * The SQL aggregation mirrors this so the displayed median is verifiable.
 */
export const jobMidpoint = (
  dayRate: number[] | null | undefined,
): number | null => {
  if (!dayRate || dayRate.length === 0) return null;
  if (dayRate.length === 1) return dayRate[0];
  const [min, max] = dayRate;
  return Math.round((min + max) / 2);
};
