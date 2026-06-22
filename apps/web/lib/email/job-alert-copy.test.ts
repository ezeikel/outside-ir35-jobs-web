import { describe, expect, it } from 'vitest';
import { jobAlertSubject } from './job-alert-copy';

// Only the pure subject logic is unit-tested. The HTML body is rendered by React
// Email (@react-email/render) — integration, verified via `pnpm email` preview +
// the actual send — and per repo convention we don't unit-test that layer (like
// RSCs). The honesty disclaimer + per-job rows live in emails/JobAlertEmail.tsx.

describe('jobAlertSubject', () => {
  it('uses singular for one job', () => {
    expect(jobAlertSubject(1, 'React · London')).toBe(
      '1 new outside-IR35 contract for "React · London"',
    );
  });

  it('uses plural for multiple jobs', () => {
    expect(jobAlertSubject(3, 'DevOps')).toBe(
      '3 new outside-IR35 contracts for "DevOps"',
    );
  });

  it('includes the search label verbatim', () => {
    expect(jobAlertSubject(2, 'Remote · £600+/day')).toContain(
      'Remote · £600+/day',
    );
  });
});
