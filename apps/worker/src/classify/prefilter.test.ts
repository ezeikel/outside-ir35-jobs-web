import { describe, expect, it } from 'vitest';
import { prefilter } from './prefilter.js';

describe('prefilter', () => {
  it('keeps a day-rate contract role', () => {
    const r = prefilter({
      position: 'Senior React Developer',
      description: '6 month contract, £550 per day, outside IR35.',
    });
    expect(r.keep).toBe(true);
  });

  it('keeps on the word "contract" alone', () => {
    expect(
      prefilter({ position: 'DevOps Engineer (Contract)', description: '' })
        .keep,
    ).toBe(true);
  });

  it('drops a permanent role even if it mentions a rate', () => {
    const r = prefilter({
      position: 'Software Engineer',
      description: 'Full-time permanent role, competitive salary.',
    });
    expect(r.keep).toBe(false);
    expect(r.reason).toContain('excluded');
  });

  it('drops a role with no contract/day-rate signal', () => {
    const r = prefilter({
      position: 'Marketing Manager',
      description: 'Join our growing team.',
    });
    expect(r.keep).toBe(false);
    expect(r.reason).toContain('no contract');
  });

  it('drops internships/apprenticeships', () => {
    expect(
      prefilter({ position: 'Summer Internship', description: 'contract' })
        .keep,
    ).toBe(false);
  });

  it('matches IR35 keywords', () => {
    expect(
      prefilter({ position: 'Data Engineer', description: 'Inside IR35.' })
        .keep,
    ).toBe(true);
  });
});
