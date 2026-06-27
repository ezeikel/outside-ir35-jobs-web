import { api } from "@/lib/api";
import type { MobileJobCard } from "@/lib/api-jobs";

// Saved jobs ("save for later"). Mirrors the web getMySavedJobs / saveJob /
// unsaveJob. Each saved entry embeds the full job card so the My Jobs > Saved tab
// renders identical cards to the board.

export type SavedJob = {
  id: string;
  savedAt: string;
  job: MobileJobCard;
};

export const fetchSavedJobs = async (): Promise<SavedJob[]> => {
  const { data } = await api.get<{ saved: SavedJob[] }>(
    "/api/mobile/saved-jobs",
  );
  return data.saved;
};

export const saveJob = async (jobId: string): Promise<void> => {
  await api.post("/api/mobile/saved-jobs", { jobId });
};

export const unsaveJob = async (jobId: string): Promise<void> => {
  await api.delete(`/api/mobile/saved-jobs/${jobId}`);
};
