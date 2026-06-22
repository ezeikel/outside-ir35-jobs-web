import { describe, expect, it } from 'vitest';
import { type AlertJob, buildJobAlertEmail } from './job-alert';

const job = (over: Partial<AlertJob> = {}): AlertJob => ({
  id: 'job1',
  position: 'React Engineer',
  companyName: 'Acme Ltd',
  dayRate: [500, 600],
  location: 'London',
  ir35Label: 'Outside (client states)',
  ...over,
});

const base = {
  searchLabel: 'React · London',
  siteUrl: 'https://www.outsideir35.jobs',
  manageUrl: 'https://www.outsideir35.jobs/alerts',
};

describe('buildJobAlertEmail', () => {
  it('pluralises the subject by job count', () => {
    expect(buildJobAlertEmail({ ...base, jobs: [job()] }).subject).toContain(
      '1 new outside-IR35 contract for',
    );
    expect(
      buildJobAlertEmail({ ...base, jobs: [job(), job({ id: 'j2' })] }).subject,
    ).toContain('2 new outside-IR35 contracts for');
  });

  it('always includes the never-assert-IR35 disclaimer (honesty rule)', () => {
    const { html } = buildJobAlertEmail({ ...base, jobs: [job()] });
    expect(html).toMatch(/never determine or guarantee a role's IR35 status/i);
  });

  it('links each job to its detail page and surfaces the stated IR35 label', () => {
    const { html } = buildJobAlertEmail({ ...base, jobs: [job()] });
    expect(html).toContain('https://www.outsideir35.jobs/job/job1');
    expect(html).toContain('Outside (client states)');
    expect(html).toContain('£500–£600/day');
  });

  it('escapes HTML in job + company names (no injection)', () => {
    const { html } = buildJobAlertEmail({
      ...base,
      jobs: [
        job({ position: '<script>x</script>', companyName: 'A & B <Ltd>' }),
      ],
    });
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A &amp; B &lt;Ltd&gt;');
  });

  it('handles a missing/empty day rate', () => {
    const { html } = buildJobAlertEmail({
      ...base,
      jobs: [job({ dayRate: [] })],
    });
    expect(html).toContain('Rate not stated');
  });
});
