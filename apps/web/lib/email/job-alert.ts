// Pure builder for the new-jobs email-alert HTML. No DB/Resend here — takes already
// matched jobs + the search context and returns { subject, html }. Pure so it's
// unit-testable and the alerts cron stays a thin caller.
//
// Honesty (docs/ir35-trust-model.md): the email never asserts a role IS outside
// IR35. It describes the saved search and, per job, surfaces only the listing's
// stated position — phrased as the client's claim, never our judgement.

// Server-safe human labels for a listing's stated IR35 position. Phrased as the
// client's claim (never our judgement) — mirrors the board's chip language.
export const IR35_SIGNAL_LABEL: Record<string, string> = {
  CLIENT_INTENDS_OUTSIDE: 'Outside (client states)',
  SDS_ISSUED: 'Outside — SDS issued',
  CONTRACT_REVIEW_HELD: 'Outside — contract review held',
  SMALL_CLIENT_EXEMPT: 'Small client — self-determined',
  UNKNOWN: 'IR35 not stated',
  INSIDE: 'Inside IR35',
};

export type AlertJob = {
  id: string;
  position: string;
  companyName: string;
  dayRate: number[]; // [min] or [min,max]
  location: string | null;
  ir35Label: string; // pre-resolved human label of the listing's stated position
};

export type JobAlertInput = {
  jobs: AlertJob[];
  searchLabel: string; // human description of the saved search, e.g. "React · London"
  siteUrl: string;
  manageUrl: string; // where to manage/turn off alerts
};

const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtRate = (dayRate: number[]): string => {
  if (!dayRate || dayRate.length === 0) return 'Rate not stated';
  const f = (n: number) => `£${n.toLocaleString('en-GB')}`;
  return dayRate.length >= 2
    ? `${f(dayRate[0])}–${f(dayRate[dayRate.length - 1])}/day`
    : `${f(dayRate[0])}/day`;
};

const jobRow = (job: AlertJob, siteUrl: string): string => {
  const meta = [fmtRate(job.dayRate), job.location, job.ir35Label]
    .filter(Boolean)
    .map((m) => esc(String(m)))
    .join(' · ');
  return `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5e5e5;">
        <a href="${siteUrl}/job/${esc(job.id)}" style="color:#111;text-decoration:none;font-size:18px;font-weight:600;">${esc(job.position)}</a>
        <div style="color:#555;font-size:14px;margin-top:2px;">${esc(job.companyName)}</div>
        <div style="color:#777;font-size:13px;margin-top:6px;">${meta}</div>
      </td>
    </tr>`;
};

export const buildJobAlertEmail = (
  input: JobAlertInput,
): { subject: string; html: string } => {
  const { jobs, searchLabel, siteUrl, manageUrl } = input;
  const count = jobs.length;
  const subject =
    count === 1
      ? `1 new outside-IR35 contract for "${searchLabel}"`
      : `${count} new outside-IR35 contracts for "${searchLabel}"`;

  const rows = jobs.map((j) => jobRow(j, siteUrl)).join('');

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f4f2;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;max-width:560px;">
          <tr><td>
            <p style="margin:0 0 4px;color:#777;font-size:12px;letter-spacing:.08em;text-transform:uppercase;">New contracts</p>
            <h1 style="margin:0 0 4px;font-size:24px;color:#111;">${count} new ${count === 1 ? 'contract' : 'contracts'} matching your search</h1>
            <p style="margin:0 0 8px;color:#555;font-size:14px;">${esc(searchLabel)}</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
            <div style="margin-top:24px;">
              <a href="${siteUrl}/jobs" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:8px;">View all on the board</a>
            </div>
            <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.5;">
              We surface what each client states about IR35 — we never determine or guarantee a role's IR35 status.
              <br />
              <a href="${manageUrl}" style="color:#777;">Manage or turn off these alerts</a>.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, html };
};
