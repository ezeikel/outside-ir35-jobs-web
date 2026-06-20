import { NextResponse } from 'next/server';

/**
 * Daily cron: trigger the aggregation worker's runs across every source. Thin
 * wrapper — it authenticates the cron (CRON_SECRET), then POSTs to each worker
 * endpoint (on Hetzner) with the shared WORKER_SECRET and returns fast. The
 * worker acks each with 202 and runs the scrape→classify→embed→ingest pipeline
 * in the background; we never wait for the actual work (10s ack timeout only).
 *
 * Scheduled in apps/web/vercel.json. Add a source by appending its endpoint.
 */
const SOURCES = ['jobserve', 'cwjobs', 'adzuna'] as const;

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

  // Fire every source; one source failing to ack must not block the others.
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const res = await fetch(`${workerUrl}/aggregate/${source}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}`,
        },
        // We only wait for the worker's 202 ack, not the actual run.
        signal: AbortSignal.timeout(10_000),
      });
      return { source, status: res.status };
    }),
  );

  const triggered = results.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { source: SOURCES[i], error: String(r.reason?.message ?? r.reason) },
  );
  const anyOk = results.some((r) => r.status === 'fulfilled');

  return NextResponse.json({ triggered }, { status: anyOk ? 202 : 502 });
};

export { handle as GET, handle as POST };
