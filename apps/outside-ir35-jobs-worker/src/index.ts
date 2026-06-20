import 'dotenv/config';
import { serve } from '@hono/node-server';
import { type Context, Hono, type Next } from 'hono';
import { logger } from 'hono/logger';
// MUST stay above every other import — Sentry patches the runtime on init.
import { Sentry } from './instrument.js';
import { runCwjobsAggregation, runJobserveAggregation } from './pipeline.js';

const app = new Hono();
app.use('*', logger());

// Bearer auth: require `Authorization: Bearer ${WORKER_SECRET}` on protected
// routes. If WORKER_SECRET is unset we allow through (local-dev convenience),
// mirroring the chunky-crayon worker.
const bearerAuth = async (c: Context, next: Next) => {
  const secret = process.env.WORKER_SECRET;
  if (!secret) return next();
  if (c.req.header('authorization') !== `Bearer ${secret}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
};

app.get('/health', (c) =>
  c.json({ status: 'ok', service: 'outside-ir35-jobs-worker' }),
);

app.use('/aggregate/*', bearerAuth);

// Kick off a Jobserve aggregation run. Returns 202 immediately and runs the
// scrape → classify → embed → ingest pipeline in the background, so the caller
// (a web cron with a 10s ack timeout) never waits for the heavy work.
app.post('/aggregate/jobserve', (c) => {
  const limit = Number(c.req.query('limit')) || undefined;
  runJobserveAggregation({ limit }).catch((err) => {
    Sentry.captureException(err);
    console.error('[aggregate/jobserve] failed:', err);
  });
  return c.json({ status: 'accepted' }, 202);
});

// Same contract for CWJobs (list-only scrape → shared pipeline).
app.post('/aggregate/cwjobs', (c) => {
  const limit = Number(c.req.query('limit')) || undefined;
  runCwjobsAggregation({ limit }).catch((err) => {
    Sentry.captureException(err);
    console.error('[aggregate/cwjobs] failed:', err);
  });
  return c.json({ status: 'accepted' }, 202);
});

app.onError((err, c) => {
  Sentry.captureException(err);
  console.error('[worker] unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = Number(process.env.PORT) || 3030;
serve({ fetch: app.fetch, port });
console.info(`[worker] listening on :${port}`);
