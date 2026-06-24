import { describe, expect, it } from 'vitest';
import {
  canonicalSourceUrl,
  extractRateText,
  parseCwjobsCards,
  type RawCard,
} from './cwjobs.js';

// Trimmed REAL CWJobs contract cards (captured from the live board): the card
// text is "<title> <company> <location> <rate-or-Competitive> <snippet>".
const cards: RawCard[] = [
  {
    title: 'Missile Test Architect',
    href: 'https://www.totaljobs.com/job/missile-test-architect/certain-advantage-job107564011?utm=x',
    text: 'Missile Test Architect Certain Advantage Bolton, Greater Manchester, BL5 1EE £60 per hour, Benefits Overtime Rate World Class Defence Organisation is currently looking to recruit 2x Missile Test Architect subcontractors on an initial 6 month contract.',
  },
  {
    title: 'Insights Executive',
    href: 'https://www.totaljobs.com/job/insights-executive/vuelio-job107563880',
    text: 'Insights Executive Vuelio South East £28,000 - £29,000 a year An Insights Executive is well-organised, with an interest in PR and/or analysis.',
  },
  {
    title: 'Salesforce Administrator & Developer',
    href: 'https://www.totaljobs.com/job/salesforce-administrator-developer/spire-global-uk-limited-job107563871',
    text: 'Salesforce Administrator & Developer SPIRE GLOBAL UK LIMITED Glasgow, Lanarkshire Competitive As Salesforce Administrator & Developer at Spire, you will own the technical foundation.',
  },
];

describe('canonicalSourceUrl', () => {
  it('keeps the totaljobs detail URL and strips tracking query', () => {
    expect(
      canonicalSourceUrl(
        'https://www.totaljobs.com/job/x/y-job123?utm=a&cmp=1',
      ),
    ).toBe('https://www.totaljobs.com/job/x/y-job123');
  });

  it('resolves a relative href against the CWJobs origin', () => {
    expect(canonicalSourceUrl('/job/foo-job9')).toBe(
      'https://www.cwjobs.co.uk/job/foo-job9',
    );
  });

  it('falls back to the origin for an empty href', () => {
    expect(canonicalSourceUrl('')).toBe('https://www.cwjobs.co.uk');
  });
});

describe('extractRateText', () => {
  it('extracts an hourly rate', () => {
    expect(extractRateText('… BL5 1EE £60 per hour, Benefits')).toBe(
      '£60 per hour',
    );
  });

  it('extracts a per-day range', () => {
    expect(extractRateText('London £500 - £600 per day Outside IR35')).toBe(
      '£500 - £600 per day',
    );
  });

  it('extracts an annual salary range (kept raw; classifier drops it from dayRate)', () => {
    expect(
      extractRateText('South East £28,000 - £29,000 a year An Insights'),
    ).toBe('£28,000 - £29,000 a year');
  });

  it('returns "Competitive" when no figure is stated', () => {
    expect(
      extractRateText('Glasgow, Lanarkshire Competitive As Salesforce'),
    ).toBe('Competitive');
  });

  it('returns "" when there is no rate signal at all', () => {
    expect(extractRateText('Some role in London with no rate quoted')).toBe('');
  });
});

describe('parseCwjobsCards', () => {
  it('parses cards into typed listings with title, rate text, and canonical url', () => {
    const jobs = parseCwjobsCards(cards);
    expect(jobs).toHaveLength(3);

    const [first] = jobs;
    expect(first.position).toBe('Missile Test Architect');
    expect(first.dayRateText).toBe('£60 per hour');
    expect(first.sourceUrl).toBe(
      'https://www.totaljobs.com/job/missile-test-architect/certain-advantage-job107564011',
    );
    // description is a short extract that includes the rate up front
    expect(first.description).toContain('Missile Test Architect');
    expect(first.description.length).toBeLessThanOrEqual(480);
  });

  it('keeps the raw rate text for each card', () => {
    const jobs = parseCwjobsCards(cards);
    expect(jobs[1].dayRateText).toBe('£28,000 - £29,000 a year');
    expect(jobs[2].dayRateText).toBe('Competitive');
  });

  it('drops cards with no title or no usable link, and de-dupes by sourceUrl', () => {
    const noisy: RawCard[] = [
      ...cards,
      {
        title: '',
        href: 'https://www.totaljobs.com/job/x-job1',
        text: 'no title',
      },
      // duplicate of the first card's URL → dropped
      {
        title: 'Missile Test Architect (dupe)',
        href: 'https://www.totaljobs.com/job/missile-test-architect/certain-advantage-job107564011',
        text: 'dupe',
      },
    ];
    const jobs = parseCwjobsCards(noisy);
    expect(jobs).toHaveLength(3); // empty-title + dupe removed
  });
});
