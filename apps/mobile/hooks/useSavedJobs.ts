import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner-native";
import { useAuth } from "@/contexts/AuthContext";
import { useViewMode } from "@/hooks/useViewMode";
import type { MobileJobCard } from "@/lib/api-jobs";
import {
  fetchSavedJobs,
  type SavedJob,
  saveJob,
  unsaveJob,
} from "@/lib/api-saved-jobs";
import {
  applyOptimisticToggle,
  nextToggleAction,
  reverseOptimisticToggle,
} from "@/lib/saved-jobs-cache";
import { useLocalSavedJobsStore } from "@/stores/localSavedJobsStore";

export const SAVED_JOBS_KEY = ["savedJobs"] as const;

// Stamp used for local saves (Date.now is fine on-device; only ordering matters).
const nowIso = () => new Date().toISOString();

// Module-level guard so the local→server merge runs ONCE per sign-in across ALL
// useSavedJobs instances (the hook is mounted by the board, the deck, the detail
// screen and My Jobs simultaneously). Reset to false whenever we observe a
// signed-out state, so the next sign-in merges again.
let mergeInFlight = false;

// Shared saved-jobs state. The heart on JobCard / the detail screen and the My
// Jobs > Saved tab all read from ONE React Query cache (SAVED_JOBS_KEY), so a
// save/unsave anywhere updates everywhere. Saving is a seeker action; gated on
// the active view mode (any onboarded user can switch).
//
// Optimism: toggle() takes the FULL job card (not just an id) so a save can
// insert a real card into the cache immediately — the heart fills AND the My Jobs
// list updates with no network wait. Unsave removes by id. Rollback on error.
export const useSavedJobs = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { mode } = useViewMode();

  // Saving is a seeker action, but it does NOT require an account: signed-out
  // seekers save locally (frictionless deck triage) and we sync on sign-in.
  const isSeeker = mode === "seeker";
  // The SERVER query only runs when signed in; signed-out reads come from the
  // local store.
  const serverEnabled = isAuthenticated && isSeeker;

  // Local (signed-out) saved jobs + actions.
  const localItems = useLocalSavedJobsStore((s) => s.items);
  const localSave = useLocalSavedJobsStore((s) => s.save);
  const localUnsave = useLocalSavedJobsStore((s) => s.unsave);
  const localClear = useLocalSavedJobsStore((s) => s.clear);

  const {
    data: saved = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: SAVED_JOBS_KEY,
    queryFn: fetchSavedJobs,
    enabled: serverEnabled,
    // The optimistic cache shows in-session saves/unsaves instantly. We also
    // refetch on toggle-settle (onSettled) to turn a synthetic save-row real, and
    // the My Jobs screen refetches on focus (useFocusEffect) so entering the tab
    // always reflects the server. A tiny stale window dedupes the rapid
    // mount+focus double-fire without suppressing the focus refresh.
    staleTime: 1_000,
  });

  // The unified saved list: server cache when signed in, local store when not.
  // Everything downstream (savedIds, isSaved, My Jobs > Saved) reads `savedList`,
  // so the two paths are interchangeable to callers.
  const savedList: SavedJob[] = useMemo(
    () =>
      isAuthenticated
        ? saved
        : localItems.map((it) => ({
            id: `local-${it.job.id}`,
            savedAt: it.savedAt,
            job: it.job,
          })),
    [isAuthenticated, saved, localItems],
  );

  // Derived directly from the unified list — no effect, no second query (a prior
  // version mirrored ids into a separate cache via useEffect and infinite-looped).
  const savedIds = useMemo(
    () => new Set(savedList.map((s) => s.job.id)),
    [savedList],
  );

  // Sync-on-sign-in: when the user signs in, push any locally-saved jobs to their
  // account (idempotent server upsert) then clear the local store, so a job saved
  // while signed out is promoted to a synced save and never lost. Guarded by a ref
  // so it runs once per sign-in transition, not on every render.
  useEffect(() => {
    if (!isAuthenticated) {
      mergeInFlight = false; // re-arm for the next sign-in
      return;
    }
    if (mergeInFlight) return;
    const pending = useLocalSavedJobsStore.getState().items;
    if (pending.length === 0) return;
    mergeInFlight = true;
    void (async () => {
      // Best-effort: save each locally-saved job server-side, then clear local and
      // refresh the server list. A failure leaves the local store intact to retry.
      try {
        await Promise.all(pending.map((it) => saveJob(it.job.id)));
        localClear();
        await queryClient.invalidateQueries({ queryKey: SAVED_JOBS_KEY });
      } catch {
        mergeInFlight = false; // allow a later retry
      }
    })();
  }, [isAuthenticated, localClear, queryClient]);

  // Optimistic toggle. The cache is the source of truth between writes; we do NOT
  // refetch after a successful toggle. Refetching on success was the "job reappears
  // a few seconds later" bug: the GET could read the server BEFORE a DELETE
  // committed (or land out of order) and repopulate a just-removed job. The server
  // writes are idempotent (upsert / deleteMany) so the optimistic cache stays
  // correct; we only refetch to RECOVER true state when a write actually FAILS.
  const toggle = useMutation({
    mutationKey: SAVED_JOBS_KEY,
    // The DIRECTION is decided up-front (before onMutate mutates the cache) and
    // passed in as `{ job, wasSaved }`. It must NOT be re-derived inside mutationFn
    // from the cache — onMutate has already optimistically toggled it there, so a
    // re-read would flip the direction (an unsave would read as not-saved and fire
    // a SAVE — the "unliking doesn't work" bug).
    mutationFn: async ({
      job,
      wasSaved,
    }: {
      job: MobileJobCard;
      wasSaved: boolean;
    }) => {
      if (wasSaved) {
        await unsaveJob(job.id);
      } else {
        await saveJob(job.id);
      }
    },
    onMutate: async ({
      job,
      wasSaved,
    }: {
      job: MobileJobCard;
      wasSaved: boolean;
    }) => {
      // Stop any in-flight refetch so it can't overwrite this optimistic change.
      await queryClient.cancelQueries({ queryKey: SAVED_JOBS_KEY });
      queryClient.setQueryData<SavedJob[]>(SAVED_JOBS_KEY, (list = []) =>
        applyOptimisticToggle(list, job, wasSaved),
      );
      return { job, wasSaved };
    },
    onError: (_e, _job, ctx) => {
      // Reverse ONLY this job on top of the LIVE list (never a stale whole-list
      // snapshot that could resurrect another in-flight mutation's removal).
      if (ctx) {
        queryClient.setQueryData<SavedJob[]>(SAVED_JOBS_KEY, (list = []) =>
          reverseOptimisticToggle(list, ctx.job, ctx.wasSaved),
        );
      }
      toast.error("Couldn’t update saved jobs. Try again.");
    },
    // Reconcile with the server once the LAST concurrent toggle settles. The write
    // has already committed (the mutationFn await resolved before onSettled), so
    // this refetch reads post-commit data — it turns a synthetic save-row into the
    // real one (fixing the "just-saved job shows up late" lag) and can't resurrect
    // a removed job. The isMutating===1 guard means a refetch never lands while
    // another toggle is still writing.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: SAVED_JOBS_KEY }) === 1) {
        void queryClient.invalidateQueries({ queryKey: SAVED_JOBS_KEY });
      }
    },
  });

  const isSaved = useCallback(
    (jobId: string) => savedIds.has(jobId),
    [savedIds],
  );

  // Decide the direction from the CURRENT cache at tap time, then hand it to the
  // mutation so the network call + optimistic update always agree. Signed out, it
  // toggles the local store instead (no network, no auth).
  const toggleJob = useCallback(
    (job: MobileJobCard) => {
      if (!isAuthenticated) {
        if (savedIds.has(job.id)) localUnsave(job.id);
        else localSave(job, nowIso());
        return;
      }
      const wasSaved =
        nextToggleAction(
          queryClient.getQueryData<SavedJob[]>(SAVED_JOBS_KEY) ?? [],
          job.id,
        ) === "unsave";
      toggle.mutate({ job, wasSaved });
    },
    [isAuthenticated, savedIds, localUnsave, localSave, queryClient, toggle],
  );

  // Save only — never unsaves. The card deck's right-swipe uses this: swiping
  // right is unambiguously "save", so it must not toggle a save back off if the
  // cache briefly disagrees. Signed out, it saves into the local store; signed in,
  // saveJob is idempotent (upsert), so an already-saved job is a harmless no-op.
  const saveJobAction = useCallback(
    (job: MobileJobCard) => {
      if (savedIds.has(job.id)) return;
      if (!isAuthenticated) {
        localSave(job, nowIso());
        return;
      }
      toggle.mutate({ job, wasSaved: false });
    },
    [isAuthenticated, savedIds, localSave, toggle],
  );

  return {
    saved: savedList,
    savedIds,
    // Signed out, the local store is synchronous — never "loading".
    isLoading: isAuthenticated ? isLoading : false,
    isError: isAuthenticated ? isError : false,
    isRefetching: isAuthenticated ? isRefetching : false,
    refetch,
    // Any seeker can save (signed-out saves go local + sync on sign-in).
    canSave: isSeeker,
    isSaved,
    toggle: toggleJob,
    save: saveJobAction,
    isToggling: toggle.isPending,
  };
};
