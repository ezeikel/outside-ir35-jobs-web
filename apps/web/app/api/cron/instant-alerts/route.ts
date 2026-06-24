import { AlertFrequency } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { runJobAlerts } from '@/app/actions';

/**
 * "Instant" job alerts. New listings only appear after the aggregation worker
 * ingests them, so 'instant' = "as soon as we've discovered matching jobs". This
 * cron is scheduled shortly AFTER aggregate-jobs (which only triggers the worker
 * and returns; the worker ingests asynchronously on Hetzner over the following
 * minutes) so the new jobs exist by the time we run. Notifies INSTANT saved
 * searches only (DAILY/WEEKLY go through the daily job-alerts cron).
 *
 * Thin wrapper per the "crons wrap actions" rule. Scheduled in vercel.json.
 */
const handle = async (request: Request) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runJobAlerts([AlertFrequency.INSTANT]);
  return NextResponse.json({ ok: true, ...result });
};

export { handle as GET, handle as POST };
