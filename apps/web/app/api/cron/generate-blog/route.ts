import { NextResponse } from 'next/server';

/**
 * Daily cron: trigger one AI blog generation run on the worker. Thin wrapper —
 * authenticates the cron (CRON_SECRET), POSTs to the worker (on Hetzner) with the
 * shared WORKER_SECRET, returns fast. The worker acks 202 and runs the
 * research → generate → validate → Sanity-write pipeline in the background.
 *
 * Scheduled in apps/web/vercel.json (05:00 UTC — after jobs aggregation at 04:00
 * so day-rate data is fresh for data-backed posts).
 */
const handle = async (request: Request) => {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerUrl = process.env.OUTSIDE_IR35_JOBS_WORKER_URL;
  if (!workerUrl) {
    return NextResponse.json(
      { error: 'OUTSIDE_IR35_JOBS_WORKER_URL not configured' },
      { status: 503 },
    );
  }

  try {
    const res = await fetch(`${workerUrl}/generate/blog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(
      { triggered: true, workerStatus: res.status },
      { status: 202 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to reach worker',
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
};

export { handle as GET, handle as POST };
