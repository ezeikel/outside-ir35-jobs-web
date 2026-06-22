import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';

/**
 * Pure normalization of the /jobs filter-bar params into validated, typed values.
 * No Prisma/SQL here — the action builds the (parameterized) query from these. A
 * silent bug (wrong rate floor, bad enum) returns wrong jobs, so it's unit-tested.
 */

export type SearchParams = {
  q?: string;
  location?: string;
  ir35?: string; // 'outside' (strict) | 'any' (incl. inside) | unset → default (not-inside)
  mode?: string; // REMOTE | HYBRID | ON_SITE
  minRate?: string; // '400' | '500' ...
  posted?: string; // '24h' | 'week' | 'month'
};

export type SearchFilters = {
  q: string;
  location: string | null;
  ir35Outside: boolean;
  // The default board hides explicit INSIDE listings — this is an outside-IR35
  // board, so an Inside-IR35 role doesn't belong on the unfiltered listing
  // (docs/ir35-trust-model.md: INSIDE is "not our niche"). True unless the user
  // explicitly opts into everything via ?ir35=any. We hide only INSIDE here, not
  // UNKNOWN — most aggregated contract work is UNKNOWN and is the bulk of the
  // board; excluding it would empty the listing.
  ir35ExcludeInside: boolean;
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

// The only IR35 bucket the default board hard-excludes. INSIDE jobs stay in the
// DB (the day-rates inside-vs-outside benchmark needs them) but never appear on
// the default /jobs board, homepage, or recommendations.
export const DEFAULT_HIDDEN_SIGNALS: JobIR35Signal[] = [JobIR35Signal.INSIDE];

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
    // Hide INSIDE by default; only ?ir35=any opts back into showing it.
    ir35ExcludeInside: params.ir35 !== 'any',
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

// Map SearchParams → the columns persisted on a SavedSearch row. Shared by the
// web saveSearch action and the mobile /api/mobile/saved-searches route so the
// two surfaces store identical rows (no drift between save-on-web and
// save-on-mobile). Stores the raw ir35 intent so save/restore round-trips.
export const toStoredSearch = (params: SearchParams) => {
  const f = normalizeFilters(params);
  return {
    query: f.q || null,
    location: f.location,
    ir35:
      params.ir35 === 'outside' || params.ir35 === 'any' ? params.ir35 : null,
    mode: f.workMode,
    minRate: f.minRate,
  };
};
