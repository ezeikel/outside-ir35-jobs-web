import { api } from "@/lib/api";

// Recruiter side: the applicants on the caller's own jobs, for the candidate swipe
// deck. Honesty-safe facts only (no platform score). Right swipe = shortlist, left
// = pass — the poster's own triage, persisted via the status endpoint.

export type CandidateCard = {
  applicationId: string;
  applicantId: string;
  status: "NEW" | "SHORTLISTED" | "PASSED";
  appliedAt: string;
  message: string | null;
  name: string;
  trustTier: string;
  trustTierLabel: string;
  rightToWorkConfirmed: boolean;
  holdsIR35Insurance: boolean;
  headline: string | null;
  seniority: string | null;
  yearsExperience: number | null;
  skills: string[];
  sectors: string[];
  verifiedCompanies: { name: string; verifiedAt: string | null }[];
};

export type ApplicantStatus = "NEW" | "SHORTLISTED" | "PASSED";

export const fetchApplicants = async (
  status: ApplicantStatus | "ALL" = "NEW",
): Promise<CandidateCard[]> => {
  const { data } = await api.get<{ applicants: CandidateCard[] }>(
    "/api/mobile/posts/applicants",
    { params: { status } },
  );
  return data.applicants;
};

export const setApplicationStatus = async (
  applicationId: string,
  status: ApplicantStatus,
): Promise<void> => {
  await api.post(`/api/mobile/applications/${applicationId}/status`, { status });
};
