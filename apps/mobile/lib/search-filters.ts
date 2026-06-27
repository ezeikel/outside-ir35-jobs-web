import type { JobsQuery } from "@/lib/api-jobs";

// The mobile board's filter + sort state. Mirrors the backend SearchParams the
// web /jobs board understands (q, location, ir35, mode, minRate, posted) — no new
// server capability. Sort is CLIENT-side (the backend has no sort param: it ranks
// by relevance when there's a query, else newest-first), applied to the returned
// cards.

export type SortMode = "relevance" | "newest";
export type WorkModeFilter = "ANY" | "REMOTE" | "HYBRID" | "ON_SITE";
export type PostedFilter = "ANY" | "24h" | "week" | "month";
// Outside-IR35 board: no "include inside" — inside listings are never shown.
export type Ir35Filter = "default" | "outside";
// Day-rate floor in £/day. 0 = any.
export type MinRateFilter = 0 | 300 | 400 | 500 | 600;

export type SearchFilters = {
  workMode: WorkModeFilter;
  posted: PostedFilter;
  minRate: MinRateFilter;
  ir35: Ir35Filter;
  sort: SortMode;
};

export const DEFAULT_FILTERS: SearchFilters = {
  workMode: "ANY",
  posted: "ANY",
  minRate: 0,
  ir35: "default",
  sort: "relevance",
};

// How many of the filters (excluding sort) differ from default — drives the
// "Filters (n)" badge so the user sees at a glance that the board is narrowed.
export const activeFilterCount = (f: SearchFilters): number => {
  let n = 0;
  if (f.workMode !== "ANY") n += 1;
  if (f.posted !== "ANY") n += 1;
  if (f.minRate !== 0) n += 1;
  if (f.ir35 !== "default") n += 1;
  return n;
};

// Build the API query from the role text, location text, and filters. Omits any
// field left at its default so the request stays minimal + matches the web board.
export const toJobsQuery = (
  q: string,
  location: string,
  f: SearchFilters,
): JobsQuery => {
  const query: JobsQuery = {};
  const trimmedQ = q.trim();
  const trimmedLoc = location.trim();
  if (trimmedQ) query.q = trimmedQ;
  if (trimmedLoc) query.location = trimmedLoc;
  if (f.workMode !== "ANY") query.mode = f.workMode;
  if (f.posted !== "ANY") query.posted = f.posted;
  if (f.minRate !== 0) query.minRate = String(f.minRate);
  if (f.ir35 !== "default") query.ir35 = f.ir35;
  return query;
};
