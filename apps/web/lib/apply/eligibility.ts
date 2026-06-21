import type { JobSource, Role } from '@outside-ir35-jobs/db/types';

/**
 * Pure eligibility check for applying to a job on-platform. Shared by the
 * createApplication action (authoritative gate) and the Apply button UI (to show
 * the right state). A silent bug here would let someone apply to the wrong thing,
 * so it's unit-tested.
 *
 * On-platform apply is only for NATIVE, active jobs the contractor doesn't own
 * and hasn't already applied to. AGGREGATED jobs have no owner to receive the
 * application — those link out to the source instead (handled in the UI).
 */

export type ApplyReason =
  | 'not_signed_in'
  | 'not_contractor'
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
  viewerRole: Role | null;
  // The job.
  jobSource: JobSource;
  jobIsActive: boolean;
  jobOwnerId: string | null; // Job.userId (null for aggregated/legacy)
  // Whether this viewer already has an Application for this job.
  alreadyApplied: boolean;
};

export const canApply = (input: CanApplyInput): ApplyEligibility => {
  if (!input.viewerId) return { ok: false, reason: 'not_signed_in' };
  // Only contractors (JOB_SEEKER) apply. (Role is a string enum at runtime.)
  if (input.viewerRole !== 'JOB_SEEKER') {
    return { ok: false, reason: 'not_contractor' };
  }
  if (input.jobSource !== 'NATIVE') return { ok: false, reason: 'aggregated' };
  if (!input.jobIsActive) return { ok: false, reason: 'inactive' };
  if (input.jobOwnerId && input.jobOwnerId === input.viewerId) {
    return { ok: false, reason: 'own_job' };
  }
  if (input.alreadyApplied) return { ok: false, reason: 'already_applied' };
  return { ok: true };
};
