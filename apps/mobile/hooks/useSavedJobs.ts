import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
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

export const SAVED_JOBS_KEY = ["savedJobs"] as const;

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

  const enabled = isAuthenticated && mode === "seeker";

  const {
    data: saved = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: SAVED_JOBS_KEY,
    queryFn: fetchSavedJobs,
    enabled,
    // The optimistic cache shows in-session saves/unsaves instantly. We also
    // refetch on toggle-settle (onSettled) to turn a synthetic save-row real, and
    // the My Jobs screen refetches on focus (useFocusEffect) so entering the tab
    // always reflects the server. A tiny stale window dedupes the rapid
    // mount+focus double-fire without suppressing the focus refresh.
    staleTime: 1_000,
  });

  // Derived directly from the cache — no effect, no second query (a prior version
  // mirrored ids into a separate cache via useEffect and infinite-looped).
  const savedIds = useMemo(
    () => new Set(saved.map((s) => s.job.id)),
    [saved],
  );

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
  // mutation so the network call + optimistic update always agree.
  const toggleJob = useCallback(
    (job: MobileJobCard) => {
      const wasSaved =
        nextToggleAction(
          queryClient.getQueryData<SavedJob[]>(SAVED_JOBS_KEY) ?? [],
          job.id,
        ) === "unsave";
      toggle.mutate({ job, wasSaved });
    },
    [queryClient, toggle],
  );

  return {
    saved,
    savedIds,
    isLoading,
    isError,
    isRefetching,
    refetch,
    canSave: enabled,
    isSaved,
    toggle: toggleJob,
    isToggling: toggle.isPending,
  };
};
