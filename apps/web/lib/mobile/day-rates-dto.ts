import 'server-only';
import { MIN_SAMPLE } from '@/lib/benchmarks/compute';

/**
 * Mobile day-rate benchmark DTO. The web getDayRateBenchmarks() is already
 * HARD-GATED at the SQL level (HAVING count(DISTINCT id) >= MIN_SAMPLE) — it only
 * ever returns a (skill, bucket) backed by >= MIN_SAMPLE distinct live listings,
 * so we never publish a rate off thin data (honesty, docs/ir35-trust-model.md).
 * This DTO just adds the display labels + tone the RN screen needs, and surfaces
 * MIN_SAMPLE so the app's empty-state copy can name the real threshold.
 *
 * IR35 bucket labels mirror lib/benchmarks/compute.ts IR35_BUCKET_LABEL exactly.
 */

type DayRateBenchmarkRow = {
  skill: string;
  ir35Bucket: 'OUTSIDE' | 'INSIDE' | 'UNKNOWN';
  sampleSize: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
};

const BUCKET_LABEL: Record<string, string> = {
  OUTSIDE: 'Outside IR35 · per client',
  INSIDE: 'Inside',
  UNKNOWN: 'Not stated',
};

// 'verified' (green) only for the outside bucket; inside/unknown are neutral.
const BUCKET_TONE: Record<string, 'verified' | 'muted'> = {
  OUTSIDE: 'verified',
  INSIDE: 'muted',
  UNKNOWN: 'muted',
};

const titleCase = (s: string): string =>
  s.replace(/\b\w/g, (c) => c.toUpperCase());

export type MobileDayRateRow = {
  skill: string;
  skillLabel: string;
  ir35Bucket: 'OUTSIDE' | 'INSIDE' | 'UNKNOWN';
  ir35Label: string;
  tone: 'verified' | 'muted';
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  sampleSize: number;
};

export type MobileDayRates = {
  rows: MobileDayRateRow[];
  totalSample: number;
  minSample: number;
};

export const toMobileDayRates = (
  benchmarks: DayRateBenchmarkRow[],
): MobileDayRates => ({
  rows: benchmarks.map((b) => ({
    skill: b.skill,
    skillLabel: titleCase(b.skill),
    ir35Bucket: b.ir35Bucket,
    ir35Label: BUCKET_LABEL[b.ir35Bucket] ?? b.ir35Bucket,
    tone: BUCKET_TONE[b.ir35Bucket] ?? 'muted',
    median: b.median,
    p25: b.p25,
    p75: b.p75,
    min: b.min,
    max: b.max,
    sampleSize: b.sampleSize,
  })),
  totalSample: benchmarks.reduce((sum, b) => sum + b.sampleSize, 0),
  minSample: MIN_SAMPLE,
});
