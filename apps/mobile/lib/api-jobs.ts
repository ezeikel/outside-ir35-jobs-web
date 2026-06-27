import { api } from "@/lib/api";

// Job board API. Mirrors the web board's /api/mobile/jobs endpoints. These are
// public (no auth) — browsing is open; applying requires a session.

export type MobileJobCard = {
  id: string;
  position: string;
  companyName: string;
  companyLogo: string | null;
  location: string;
  dayRate: number[];
  ir35Signal: string;
  ir35Label: string;
  workMode: string;
  workModeLabel: string;
  contractLengthDays: number | null;
  source: "NATIVE" | "AGGREGATED";
  postedAt: string;
};

export type MobileJobDetail = MobileJobCard & {
  descriptionHtml: string;
  descriptionText: string;
  howToApplyHtml: string;
  sourceUrl: string | null;
  ir35Claim: { text: string; attributedTo: string; statedAt: string } | null;
};

// Per-viewer apply eligibility, returned alongside the detail when signed in.
export type ApplyEligibility = {
  canApply: boolean;
  reason?: string;
  alreadyApplied: boolean;
};

export type JobsQuery = {
  q?: string;
  location?: string;
  ir35?: string;
  mode?: string;
  minRate?: string;
  posted?: string;
};

export const fetchJobs = async (query: JobsQuery = {}): Promise<MobileJobCard[]> => {
  const { data } = await api.get<{ jobs: MobileJobCard[] }>("/api/mobile/jobs", {
    params: query,
  });
  return data.jobs;
};

export const fetchJob = async (
  id: string,
): Promise<{ job: MobileJobDetail; apply?: ApplyEligibility }> => {
  const { data } = await api.get<{
    job: MobileJobDetail;
    apply?: ApplyEligibility;
  }>(`/api/mobile/jobs/${id}`);
  return data;
};

export const applyToJob = async (
  jobId: string,
  message?: string,
): Promise<void> => {
  await api.post("/api/mobile/applications", { jobId, message });
};

// Posting a contract from mobile. The body mirrors POST /api/mobile/jobs (which
// wraps the shared createUnpaidJob primitive). The job is created PENDING +
// isActive=false; the returned jobId is then paid for via the native Stripe
// Payment Sheet and goes live on the Stripe webhook. `description` + `howToApply`
// are HTML strings (from the Enriched editor), matching the web TipTap output.
export type PostJobInput = {
  companyName: string;
  position: string;
  description: string;
  keywords: string;
  location: {
    address: string;
    placeId: string;
    coordinates: { lat: number | null; lng: number | null };
  };
  companyLogo?: string;
  dayRate: [number] | [number, number];
  howToApply: string;
  applicationEmail: string;
  workMode: "REMOTE" | "HYBRID" | "ON_SITE";
  ir35Signal?: string;
};

export const postJob = async (
  input: PostJobInput,
): Promise<{ jobId: string; paymentStatus: string }> => {
  const { data } = await api.post<{ jobId: string; paymentStatus: string }>(
    "/api/mobile/jobs",
    input,
  );
  return data;
};

// Everything the native Stripe Payment Sheet needs to charge for a job posting.
export type JobPaymentIntent = {
  paymentIntentClientSecret: string;
  customerId: string;
  ephemeralKeySecret: string;
  publishableKey: string;
  amount: number; // minor units (pence)
  currency: string;
};

export const createJobPaymentIntent = async (
  jobId: string,
): Promise<JobPaymentIntent> => {
  const { data } = await api.post<JobPaymentIntent>(
    `/api/mobile/jobs/${jobId}/payment-intent`,
  );
  return data;
};
