import { describe, expect, it } from 'vitest';
import {
  type AdzunaResult,
  adzunaRateText,
  mapAdzunaResult,
  parseAdzunaPage,
} from './adzuna.js';

const base: AdzunaResult = {
  id: '123',
  title: 'Senior <b>React</b> Developer',
  description: 'Build things with React &amp; TypeScript.',
  redirect_url: 'https://www.adzuna.co.uk/jobs/details/123#track',
  salary_min: 80000,
  salary_max: 95000,
  salary_is_predicted: '0',
  contract_type: 'contract',
  company: { display_name: 'Acme Ltd' },
  location: { display_name: 'London' },
};

describe('adzunaRateText', () => {
  it('formats a real annual salary range as "per year"', () => {
    expect(adzunaRateText(base)).toBe('£80,000 - £95,000 per year');
  });

  it('formats a single real salary as "per year"', () => {
    expect(adzunaRateText({ ...base, salary_max: 80000 })).toBe(
      '£80,000 per year',
    );
  });

  it('returns "" for a PREDICTED salary (string "1")', () => {
    expect(adzunaRateText({ ...base, salary_is_predicted: '1' })).toBe('');
  });

  it('returns "" for a predicted salary (boolean true)', () => {
    expect(adzunaRateText({ ...base, salary_is_predicted: true })).toBe('');
  });

  it('returns "" when no salary is present', () => {
    expect(
      adzunaRateText({
        ...base,
        salary_min: undefined,
        salary_max: undefined,
      }),
    ).toBe('');
  });
});

describe('mapAdzunaResult', () => {
  it('maps a result to a ScrapedJob, stripping HTML and tracking fragment', () => {
    const job = mapAdzunaResult(base);
    expect(job).not.toBeNull();
    expect(job?.position).toBe('Senior React Developer');
    expect(job?.companyName).toBe('Acme Ltd');
    expect(job?.location).toBe('London');
    expect(job?.dayRateText).toBe('£80,000 - £95,000 per year');
    expect(job?.sourceUrl).toBe('https://www.adzuna.co.uk/jobs/details/123');
    expect(job?.description).toContain('Senior React Developer');
    expect(job?.description).not.toContain('<b>');
    expect(job?.description.length).toBeLessThanOrEqual(480);
  });

  it('returns null without a title', () => {
    expect(mapAdzunaResult({ ...base, title: undefined })).toBeNull();
  });

  it('returns null without a valid redirect_url', () => {
    expect(mapAdzunaResult({ ...base, redirect_url: undefined })).toBeNull();
    expect(mapAdzunaResult({ ...base, redirect_url: 'not-a-url' })).toBeNull();
  });

  it('falls back to "See listing" when no company is given', () => {
    expect(mapAdzunaResult({ ...base, company: undefined })?.companyName).toBe(
      'See listing',
    );
  });
});

describe('parseAdzunaPage', () => {
  it('keeps contract roles, drops permanent, de-dupes by sourceUrl', () => {
    const jobs = parseAdzunaPage({
      results: [
        base,
        {
          ...base,
          contract_type: 'permanent',
          redirect_url: 'https://x/perm',
        },
        // duplicate sourceUrl of base → dropped
        { ...base, id: '999' },
        {
          ...base,
          redirect_url: 'https://www.adzuna.co.uk/jobs/details/456',
          title: 'DevOps Engineer',
        },
      ],
    });
    expect(jobs).toHaveLength(2); // base + the 456 one; perm + dupe removed
    expect(jobs.map((j) => j.position)).toEqual([
      'Senior React Developer',
      'DevOps Engineer',
    ]);
  });

  it('returns [] for an empty / missing results array', () => {
    expect(parseAdzunaPage({})).toEqual([]);
    expect(parseAdzunaPage({ results: [] })).toEqual([]);
  });
});
