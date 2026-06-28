import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MobileJobCard } from "@/lib/api-jobs";

// Saved jobs for a SIGNED-OUT user. The whole point of the swipe deck is
// frictionless triage — a brand-new user should be able to land, swipe, and save
// the good ones immediately, with no sign-in wall. So a signed-out save goes here
// (on-device, like dismissedJobsStore) instead of the server.
//
// We store the FULL job card (not just the id) so My Jobs > Saved can render the
// saved cards while signed out, with no network. On sign-in, useSavedJobs merges
// these into the account (idempotent server upsert) and clears this store — so a
// saved job is never lost, just promoted from local to synced.
//
// Signed-IN saves still go straight to the server (the source of truth); this
// store is only the signed-out path.

type LocalSavedJobsState = {
  // Most-recent-first, like the server's saved list ordering.
  items: { job: MobileJobCard; savedAt: string }[];
};

type LocalSavedJobsActions = {
  save: (job: MobileJobCard, savedAt: string) => void;
  unsave: (jobId: string) => void;
  clear: () => void;
};

export const useLocalSavedJobsStore = create<
  LocalSavedJobsState & LocalSavedJobsActions
>()(
  persist(
    (set) => ({
      items: [],
      save: (job, savedAt) =>
        set((s) =>
          s.items.some((it) => it.job.id === job.id)
            ? s
            : { items: [{ job, savedAt }, ...s.items] },
        ),
      unsave: (jobId) =>
        set((s) => ({ items: s.items.filter((it) => it.job.id !== jobId) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "local-saved-jobs-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
