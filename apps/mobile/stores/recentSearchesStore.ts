import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Recent searches — a small local history of role + location pairs the user has
// searched, so they can re-run one with a tap. Local-only (AsyncStorage); the
// server-side saved searches (with alerts) are a separate, deliberate action.

export type RecentSearch = {
  // The role/skill/company text and the location text, either of which may be
  // empty (you can search by role only, location only, or both).
  q: string;
  location: string;
};

const MAX_RECENTS = 8;

const sameSearch = (a: RecentSearch, b: RecentSearch) =>
  a.q.trim().toLowerCase() === b.q.trim().toLowerCase() &&
  a.location.trim().toLowerCase() === b.location.trim().toLowerCase();

type RecentSearchesState = { recents: RecentSearch[] };
type RecentSearchesActions = {
  add: (search: RecentSearch) => void;
  remove: (search: RecentSearch) => void;
  clear: () => void;
};

export const useRecentSearchesStore = create<
  RecentSearchesState & RecentSearchesActions
>()(
  persist(
    (set) => ({
      recents: [],
      add: (search) =>
        set((state) => {
          // Ignore empty searches (nothing to recall).
          if (!search.q.trim() && !search.location.trim()) return state;
          // De-dupe: drop any existing match, then push to the front, cap length.
          const deduped = state.recents.filter((r) => !sameSearch(r, search));
          return { recents: [search, ...deduped].slice(0, MAX_RECENTS) };
        }),
      remove: (search) =>
        set((state) => ({
          recents: state.recents.filter((r) => !sameSearch(r, search)),
        })),
      clear: () => set({ recents: [] }),
    }),
    {
      name: "recent-searches-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

// Human label for a recent search chip, e.g. "React · London" / "London" / "React".
export const recentSearchLabel = (s: RecentSearch): string => {
  const parts = [s.q.trim(), s.location.trim()].filter(Boolean);
  return parts.join(" · ");
};
