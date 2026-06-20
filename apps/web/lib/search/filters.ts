import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';

/**
 * Pure normalization of the /jobs filter-bar params into validated, typed values.
 * No Prisma/SQL here — the action builds the (parameterized) query from these. A
 * silent bug (wrong rate floor, bad enum) returns wrong jobs, so it's unit-tested.
 */

export type SearchParams = {
  q?: string;
  location?: string;
  ir35?: string; // 'outside' | 'any'
  mode?: string; // REMOTE | HYBRID | ON_SITE
  minRate?: string; // '400' | '500' ...
  posted?: string; // '24h' | 'week' | 'month'
};

export type SearchFilters = {
  q: string;
  location: string | null;
  ir35Outside: boolean;
  workMode: WorkMode | null;
  minRate: number | null;
  postedSinceDays: number | null;
};

// Outside-leaning IR35 signals (matches JobPost's isOutsideClaim). UNKNOWN +
// INSIDE excluded — we never treat unknown as outside.
export const OUTSIDE_SIGNALS: JobIR35Signal[] = [
  JobIR35Signal.CLIENT_INTENDS_OUTSIDE,
  JobIR35Signal.SDS_ISSUED,
  JobIR35Signal.CONTRACT_REVIEW_HELD,
  JobIR35Signal.SMALL_CLIENT_EXEMPT,
];

const POSTED_DAYS: Record<string, number> = {
  '24h': 1,
  week: 7,
  month: 30,
};

const isWorkMode = (v: string): v is WorkMode =>
  (Object.values(WorkMode) as string[]).includes(v);

export const normalizeFilters = (params: SearchParams): SearchFilters => {
  const minRateNum = params.minRate ? Number(params.minRate) : NaN;

  return {
    q: (params.q ?? '').trim(),
    location: params.location?.trim() || null,
    ir35Outside: params.ir35 === 'outside',
    workMode:
      params.mode && isWorkMode(params.mode) ? (params.mode as WorkMode) : null,
    minRate:
      Number.isFinite(minRateNum) && minRateNum > 0
        ? Math.round(minRateNum)
        : null,
    postedSinceDays: params.posted
      ? (POSTED_DAYS[params.posted] ?? null)
      : null,
  };
};

// Whether any constraint at all is active (drives the no-query fast path).
export const hasActiveFilters = (f: SearchFilters): boolean =>
  !!f.location ||
  f.ir35Outside ||
  !!f.workMode ||
  f.minRate !== null ||
  f.postedSinceDays !== null;
