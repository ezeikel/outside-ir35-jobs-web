import { AlertFrequency } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { runJobAlerts } from '@/app/actions';

/**
 * Daily cron: notify contractors (email + push) of new jobs matching their saved
 * searches. Thin wrapper per the "crons wrap actions" rule — authenticate
 * (CRON_SECRET), call the action, return its counts. Matching reuses the live
 * board's filter conditions, so an alert never surfaces a job the board wouldn't.
 *
 * Runs DAILY searches every day; WEEKLY searches only on Mondays. INSTANT
 * searches are NOT run here — they fire from the aggregate-jobs cron right after
 * new listings land. Scheduled in apps/web/vercel.json.
 */
const handle = async (request: Request) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const frequencies: AlertFrequency[] = [AlertFrequency.DAILY];
  // getUTCDay(): 0=Sun, 1=Mon. Weekly digest fires on Mondays.
  if (new Date().getUTCDay() === 1) frequencies.push(AlertFrequency.WEEKLY);

  const result = await runJobAlerts(frequencies);
  return NextResponse.json({ ok: true, frequencies, ...result });
};

export { handle as GET, handle as POST };
