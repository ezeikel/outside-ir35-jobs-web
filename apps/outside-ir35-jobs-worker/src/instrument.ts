// Sentry must be initialised BEFORE any other module is imported so its
// auto-instrumentation can patch the runtime. Keep this file as the very first
// import in src/index.ts — `import { Sentry } from './instrument.js';` on line 1.
// Mirrors the chunky-crayon / parking-ticket-pal worker convention.
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV || 'production',
    // Lower sample rate than web — the worker runs long AI/scrape jobs.
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    beforeSend(event) {
      event.tags = { ...event.tags, service: 'outside-ir35-jobs-worker' };
      return event;
    },
  });
  console.info(
    `[sentry] initialised (${process.env.NODE_ENV || 'production'})`,
  );
} else {
  console.warn('[sentry] SENTRY_DSN not set — error reporting disabled');
}

export { Sentry };
