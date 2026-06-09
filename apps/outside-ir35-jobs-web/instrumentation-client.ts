import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn:
    SENTRY_DSN ||
    'https://c52cf20aa858e87418c5aaa6c3a412f0@o358156.ingest.us.sentry.io/4507124604665856',
  sendDefaultPii: false,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.2,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// eslint-disable-next-line import/prefer-default-export
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
