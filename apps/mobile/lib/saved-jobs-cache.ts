import type { MobileJobCard } from "@/lib/api-jobs";
import type { SavedJob } from "@/lib/api-saved-jobs";

// Pure cache transforms for the optimistic saved-jobs flow. Extracted from the
// useSavedJobs hook so the race-critical logic (what happens when several
// save/unsave toggles run concurrently) is unit-tested without RN context.
//
// THE BUG these guard against: with N toggles in flight at once, a whole-list
// snapshot rollback (or a refetch that resolves mid-write) could resurrect a job
// the user just removed. The rule here: every transform is applied ON TOP OF the
// LIVE list and touches ONLY one job — never restores a stale whole-list snapshot.

const synthetic = (job: MobileJobCard): SavedJob => ({
  id: `optimistic-${job.id}`,
  savedAt: "",
  job,
});

// Optimistically toggle one job in the list. Idempotent: adding an already-present
// job, or removing an absent one, is a no-op (so duplicate events can't double-add).
export const applyOptimisticToggle = (
  list: SavedJob[],
  job: MobileJobCard,
  wasSaved: boolean,
): SavedJob[] => {
  if (wasSaved) {
    // We're unsaving → remove this job's row.
    return list.filter((s) => s.job.id !== job.id);
  }
  // We're saving → add a synthetic row if not already present.
  return list.some((s) => s.job.id === job.id)
    ? list
    : [synthetic(job), ...list];
};

// Reverse a toggle that failed on the server, applied on top of the LIVE list
// (NOT a stale snapshot). If we'd removed it, put it back; if we'd added it, drop
// it. Only ever touches this one job, so a rollback can't resurrect a different
// job another in-flight mutation removed.
export const reverseOptimisticToggle = (
  list: SavedJob[],
  job: MobileJobCard,
  wasSaved: boolean,
): SavedJob[] => {
  if (wasSaved) {
    // We removed it optimistically → re-add it (if it's not already back).
    return list.some((s) => s.job.id === job.id)
      ? list
      : [synthetic(job), ...list];
  }
  // We added it optimistically → take it back out.
  return list.filter((s) => s.job.id !== job.id);
};

export const isJobSaved = (list: SavedJob[], jobId: string): boolean =>
  list.some((s) => s.job.id === jobId);

// The network call a toggle should make, decided from the CURRENT list BEFORE any
// optimistic mutation. THE BUG this guards against: deciding direction by re-reading
// the cache AFTER the optimistic toggle already flipped it — an unsave then reads as
// "not saved" and fires a SAVE ("unliking doesn't work"). Always decide up-front and
// thread the result through.
export type ToggleAction = "save" | "unsave";

export const nextToggleAction = (
  list: SavedJob[],
  jobId: string,
): ToggleAction => (isJobSaved(list, jobId) ? "unsave" : "save");
