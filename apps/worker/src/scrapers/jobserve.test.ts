import { describe, expect, it } from 'vitest';
import { parseRetrieveJobs } from './jobserve.js';

// A trimmed real RetrieveJobs response shape (the SPA returns { d: "<fragment>" }).
const fixture = JSON.stringify({
  d:
    '<div class="jobSearchContainer">' +
    '<div class="jobItem" id="DD211F4B6C652E333A"><div class="jobsum newjobsum">' +
    '<h3 class="jobResultsTitle">Executive Assistant, &pound;200pd inside IR35</h3>' +
    '<p class="jobResultsSalary">&pound;200pd inside IR35</p>' +
    '<p class="jobResultsLoc">Manchester</p>' +
    '<p class="jobResultsType">Contract</p>' +
    '<p class="when">2 days ago</p></div></div>' +
    '<div class="jobItem" id="DC54B7574526EEAC01"><div class="jobsum newjobsum">' +
    '<h3 class="jobResultsTitle">Research Operations Manager</h3>' +
    '<p class="jobResultsSalary">600-675/Day</p>' +
    '<p class="jobResultsLoc">London</p>' +
    '<p class="jobResultsType">Contract</p></div></div>' +
    // a permanent one that must be filtered out
    '<div class="jobItem" id="PERM123"><div class="jobsum newjobsum">' +
    '<h3 class="jobResultsTitle">Office Manager</h3>' +
    '<p class="jobResultsSalary">35k Annual</p>' +
    '<p class="jobResultsLoc">Leeds</p>' +
    '<p class="jobResultsType">Permanent</p></div></div>' +
    '</div>',
});

describe('parseRetrieveJobs', () => {
  it('parses contract jobItems into typed listings', () => {
    const jobs = parseRetrieveJobs(fixture);
    expect(jobs).toHaveLength(2); // permanent one filtered out

    const [first] = jobs;
    expect(first.position).toBe('Executive Assistant, £200pd inside IR35');
    expect(first.dayRateText).toBe('£200pd inside IR35');
    expect(first.location).toBe('Manchester');
    expect(first.sourceUrl).toBe(
      'https://www.jobserve.com/gb/en/search-result/?id=DD211F4B6C652E333A',
    );
    // description is a short extract (title + rate + loc), never a full body
    expect(first.description).toContain('Executive Assistant');
  });

  it('filters out non-contract (Permanent) jobs', () => {
    const jobs = parseRetrieveJobs(fixture);
    expect(jobs.some((j) => j.position === 'Office Manager')).toBe(false);
  });

  it('decodes HTML entities in titles/rates', () => {
    const jobs = parseRetrieveJobs(fixture);
    expect(jobs[0].position).not.toContain('&pound;');
    expect(jobs[0].position).toContain('£');
  });

  it('returns [] for a non-JSON or empty body', () => {
    expect(parseRetrieveJobs('not json')).toEqual([]);
    expect(parseRetrieveJobs(JSON.stringify({ d: '' }))).toEqual([]);
  });
});
