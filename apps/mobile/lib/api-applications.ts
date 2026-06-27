import { api } from "@/lib/api";
import type { MobileJobCard } from "@/lib/api-jobs";

// The contractor's applications (jobs they've applied to) for the My Jobs >
// Applications tab. Each carries the job card + applied date + whether the poster
// has viewed it.
export type Application = {
  id: string;
  appliedAt: string;
  viewed: boolean;
  job: MobileJobCard;
};

export const fetchApplications = async (): Promise<Application[]> => {
  const { data } = await api.get<{ applications: Application[] }>(
    "/api/mobile/applications/list",
  );
  return data.applications;
};
