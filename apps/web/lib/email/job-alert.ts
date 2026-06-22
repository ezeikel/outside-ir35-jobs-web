import { render } from '@react-email/render';
import JobAlertEmail, { type AlertJob } from '@/emails/JobAlertEmail';
import { jobAlertSubject } from './job-alert-copy';

// Re-export the pure label map so callers (actions.ts) have one import site.
export { IR35_SIGNAL_LABEL } from './job-alert-copy';

export type { AlertJob };

export type JobAlertInput = {
  jobs: AlertJob[];
  searchLabel: string;
  siteUrl: string;
  manageUrl: string; // where to manage/turn off alerts
};

// Render the React Email JobAlertEmail component to a subject + HTML string for
// Resend. Honesty (docs/ir35-trust-model.md): the template surfaces each listing's
// STATED IR35 position and carries the never-determine/guarantee disclaimer.
export const buildJobAlertEmail = async (
  input: JobAlertInput,
): Promise<{ subject: string; html: string }> => {
  const subject = jobAlertSubject(input.jobs.length, input.searchLabel);

  const html = await render(
    JobAlertEmail({
      jobs: input.jobs,
      searchLabel: input.searchLabel,
      siteUrl: input.siteUrl,
      manageUrl: input.manageUrl,
    }),
  );

  return { subject, html };
};
