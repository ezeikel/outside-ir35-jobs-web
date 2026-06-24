import { api } from "@/lib/api";
import type { JobsQuery } from "@/lib/api-jobs";

// Saved searches + alerts. Mirrors the web /alerts surface.

export type AlertFrequency = "INSTANT" | "DAILY" | "WEEKLY";

export type SavedSearch = {
  id: string;
  query: string | null;
  location: string | null;
  ir35: string | null;
  mode: string | null;
  minRate: number | null;
  alertsEnabled: boolean;
  alertFrequency: AlertFrequency;
  createdAt: string;
};

export const fetchSavedSearches = async (): Promise<SavedSearch[]> => {
  const { data } = await api.get<{ searches: SavedSearch[] }>(
    "/api/mobile/saved-searches",
  );
  return data.searches;
};

export const saveSearch = async (query: JobsQuery): Promise<SavedSearch> => {
  const { data } = await api.post<{ search: SavedSearch }>(
    "/api/mobile/saved-searches",
    query,
  );
  return data.search;
};

export const deleteSavedSearch = async (id: string): Promise<void> => {
  await api.delete(`/api/mobile/saved-searches/${id}`);
};

export const setSavedSearchAlerts = async (
  id: string,
  alertsEnabled: boolean,
): Promise<void> => {
  await api.patch(`/api/mobile/saved-searches/${id}`, { alertsEnabled });
};

export const setSavedSearchFrequency = async (
  id: string,
  alertFrequency: AlertFrequency,
): Promise<void> => {
  await api.patch(`/api/mobile/saved-searches/${id}`, { alertFrequency });
};

// Human label for a saved search — mirrors the web's searchLabel().
export const searchLabel = (s: SavedSearch): string => {
  const parts: string[] = [];
  if (s.query) parts.push(s.query);
  if (s.location) parts.push(s.location);
  if (s.mode) parts.push(s.mode.toLowerCase().replace("_", "-"));
  if (s.minRate) parts.push(`£${s.minRate}+/day`);
  if (s.ir35 === "outside") parts.push("outside only");
  return parts.length ? parts.join(" · ") : "All outside-IR35 contracts";
};
