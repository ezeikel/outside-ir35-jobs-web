import type { JobSource } from '@outside-ir35-jobs/db/types';

/**
 * Pure eligibility check for applying to a job on-platform. Shared by the
 * createApplication action (authoritative gate) and the Apply button UI (to show
 * the right state). A silent bug here would let someone apply to the wrong thing,
 * so it's unit-tested.
 *
 * DUAL-CAPABILITY: any onboarded user may apply (role is just a default VIEW, not
 * a capability) — a user who also posts can still apply to OTHER people's roles.
 * What's blocked is applying to your OWN job, to an inactive/aggregated job, or
 * twice. AGGREGATED jobs have no owner to receive the application — those link out
 * to the source instead (handled in the UI).
 */

export type ApplyReason =
  | 'not_signed_in'
  | 'not_onboarded'
  | 'aggregated' // external listing — apply at source, not here
  | 'inactive'
  | 'own_job'
  | 'already_applied';

export type ApplyEligibility =
  | { ok: true }
  | { ok: false; reason: ApplyReason };

export type CanApplyInput = {
  // Viewer (the would-be applicant).
  viewerId: string | null;
  // Whether the viewer has finished onboarding (picked a default role). A
  // not-yet-onboarded user is mid-signup, not eligible to act yet.
  viewerOnboarded: boolean;
  // The job.
  jobSource: JobSource;
  jobIsActive: boolean;
  jobOwnerId: string | null; // Job.userId (null for aggregated/legacy)
  // Whether this viewer already has an Application for this job.
  alreadyApplied: boolean;
};

export const canApply = (input: CanApplyInput): ApplyEligibility => {
  if (!input.viewerId) return { ok: false, reason: 'not_signed_in' };
  if (!input.viewerOnboarded) return { ok: false, reason: 'not_onboarded' };
  if (input.jobSource !== 'NATIVE') return { ok: false, reason: 'aggregated' };
  if (!input.jobIsActive) return { ok: false, reason: 'inactive' };
  if (input.jobOwnerId && input.jobOwnerId === input.viewerId) {
    return { ok: false, reason: 'own_job' };
  }
  if (input.alreadyApplied) return { ok: false, reason: 'already_applied' };
  return { ok: true };
};
