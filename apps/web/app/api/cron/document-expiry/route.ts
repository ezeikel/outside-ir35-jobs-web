import { NextResponse } from 'next/server';
import { sweepDocumentExpiry } from '@/app/actions';

/**
 * Daily cron: recompute contractor-document statuses from their expiry dates
 * (ON_FILE → EXPIRING → FAILED). Thin wrapper per the "crons wrap actions" rule —
 * it authenticates, calls the action, and returns its result.
 *
 * Scheduled in apps/web/vercel.json. Authenticated by CRON_SECRET (Bearer).
 */
const handle = async (request: Request) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sweepDocumentExpiry();
  return NextResponse.json({ ok: true, ...result });
};

export { handle as GET, handle as POST };
