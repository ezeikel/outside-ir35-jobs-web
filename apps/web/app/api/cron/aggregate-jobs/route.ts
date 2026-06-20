import { NextResponse } from 'next/server';

/**
 * Daily cron: trigger the aggregation worker's Jobserve run. Thin wrapper — it
 * authenticates the cron (CRON_SECRET), then POSTs to the worker (on Hetzner)
 * with the shared WORKER_SECRET and returns fast. The worker acks with 202 and
 * runs the scrape→classify→embed→ingest pipeline in the background; we never
 * wait for it (10s ack timeout only).
 *
 * Scheduled in apps/web/vercel.json.
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
    const res = await fetch(`${workerUrl}/aggregate/jobserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}`,
      },
      // We only wait for the worker's 202 ack, not the actual run.
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
