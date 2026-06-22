import 'server-only';
import { Resend } from 'resend';

/**
 * Lazily-constructed Resend client (test/live keyed purely off RESEND_API_KEY).
 * Lazy so a missing key never crashes module import — it only throws when an email
 * is actually sent. Returns null when unconfigured so callers can no-op cleanly
 * (e.g. local dev without a key) rather than fail the surrounding action.
 */
let resend: Resend | null = null;

const getResend = (): Resend | null => {
  if (resend) return resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  resend = new Resend(key);
  return resend;
};

// From address for transactional email. Override per-env via RESEND_FROM.
// IMPORTANT: the FROM domain (outsideir35.jobs) MUST be verified in Resend
// (SPF/DKIM) or every send fails and the daily alert cron silently no-delivers.
const FROM =
  process.env.RESEND_FROM ?? 'outsideir35.jobs <alerts@outsideir35.jobs>';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Send one transactional email. Best-effort: returns { sent: false } if Resend is
 * unconfigured or the send fails, so a caller (e.g. the alerts cron) can record the
 * outcome and move on rather than throw mid-batch.
 */
export const sendEmail = async ({
  to,
  subject,
  html,
}: SendEmailInput): Promise<{ sent: boolean; error?: string }> => {
  const client = getResend();
  if (!client) return { sent: false, error: 'RESEND_API_KEY not configured' };

  try {
    const { error } = await client.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
    if (error) return { sent: false, error: error.message };
    return { sent: true };
  } catch (e) {
    return {
      sent: false,
      error: e instanceof Error ? e.message : 'send failed',
    };
  }
};
