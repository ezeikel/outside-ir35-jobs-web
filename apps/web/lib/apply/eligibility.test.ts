import { describe, expect, it } from 'vitest';
import { type CanApplyInput, canApply } from './eligibility';

const base: CanApplyInput = {
  viewerId: 'u_seeker',
  viewerRole: 'JOB_SEEKER',
  jobSource: 'NATIVE',
  jobIsActive: true,
  jobOwnerId: 'u_poster',
  alreadyApplied: false,
};

describe('canApply', () => {
  it('allows a contractor to apply to an active native job they do not own', () => {
    expect(canApply(base)).toEqual({ ok: true });
  });

  it('rejects when not signed in', () => {
    expect(canApply({ ...base, viewerId: null })).toEqual({
      ok: false,
      reason: 'not_signed_in',
    });
  });

  it('rejects a non-contractor (e.g. a poster)', () => {
    expect(canApply({ ...base, viewerRole: 'JOB_POSTER' })).toEqual({
      ok: false,
      reason: 'not_contractor',
    });
  });

  it('rejects an aggregated job (apply at source instead)', () => {
    expect(canApply({ ...base, jobSource: 'AGGREGATED' })).toEqual({
      ok: false,
      reason: 'aggregated',
    });
  });

  it('rejects an inactive job', () => {
    expect(canApply({ ...base, jobIsActive: false })).toEqual({
      ok: false,
      reason: 'inactive',
    });
  });

  it('rejects applying to your own job', () => {
    expect(canApply({ ...base, jobOwnerId: 'u_seeker' })).toEqual({
      ok: false,
      reason: 'own_job',
    });
  });

  it('rejects a duplicate application', () => {
    expect(canApply({ ...base, alreadyApplied: true })).toEqual({
      ok: false,
      reason: 'already_applied',
    });
  });

  it('checks role before job fields (a non-contractor on an aggregated job is not_contractor)', () => {
    expect(
      canApply({
        ...base,
        viewerRole: 'JOB_POSTER',
        jobSource: 'AGGREGATED',
      }),
    ).toEqual({ ok: false, reason: 'not_contractor' });
  });
});
