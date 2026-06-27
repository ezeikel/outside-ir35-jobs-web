import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Jobs the seeker swiped LEFT (dismissed) in the card deck. Local-first: this is a
// pure UI signal ("don't show me this again"), persisted on-device so a dismissed
// card doesn't reappear across sessions. We keep it sticky-but-clearable — the
// deck's empty state offers a reset, and a hard "show everything" is always one
// tap away. (No backend sync in v1; a future server-side "not interested" signal
// could feed recommendations, but that's a deliberate later step.)
//
// Saving a job is the RIGHT swipe and goes through the real saved-jobs system
// (useSavedJobs / SavedJob model) — only dismissals live here.

type DismissedJobsState = {
  ids: string[];
};

type DismissedJobsActions = {
  dismiss: (jobId: string) => void;
  undo: (jobId: string) => void;
  clear: () => void;
};

export const useDismissedJobsStore = create<
  DismissedJobsState & DismissedJobsActions
>()(
  persist(
    (set) => ({
      ids: [],
      dismiss: (jobId) =>
        set((s) => (s.ids.includes(jobId) ? s : { ids: [...s.ids, jobId] })),
      // Undo a dismissal (e.g. an "undo" affordance after a left swipe).
      undo: (jobId) => set((s) => ({ ids: s.ids.filter((id) => id !== jobId) })),
      clear: () => set({ ids: [] }),
    }),
    {
      name: "dismissed-jobs-store",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
