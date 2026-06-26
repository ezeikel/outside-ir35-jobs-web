import { describe, expect, it } from 'vitest';
import { type CanApplyInput, canApply } from './eligibility';

const base: CanApplyInput = {
  viewerId: 'u_viewer',
  viewerOnboarded: true,
  jobSource: 'NATIVE',
  jobIsActive: true,
  jobOwnerId: 'u_poster',
  alreadyApplied: false,
};

describe('canApply', () => {
  it('allows any onboarded user to apply to an active native job they do not own', () => {
    expect(canApply(base)).toEqual({ ok: true });
  });

  it('rejects when not signed in', () => {
    expect(canApply({ ...base, viewerId: null })).toEqual({
      ok: false,
      reason: 'not_signed_in',
    });
  });

  it('rejects a not-yet-onboarded viewer', () => {
    expect(canApply({ ...base, viewerOnboarded: false })).toEqual({
      ok: false,
      reason: 'not_onboarded',
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

  it('rejects applying to your own job (the dual-capability self-apply guard)', () => {
    expect(canApply({ ...base, jobOwnerId: 'u_viewer' })).toEqual({
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

  it('checks onboarding before job fields (a not-onboarded viewer on an aggregated job is not_onboarded)', () => {
    expect(
      canApply({
        ...base,
        viewerOnboarded: false,
        jobSource: 'AGGREGATED',
      }),
    ).toEqual({ ok: false, reason: 'not_onboarded' });
  });
});
