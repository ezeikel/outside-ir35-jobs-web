import { Stagehand } from '@browserbasehq/stagehand';

export type BrowserEnv = 'BROWSERBASE' | 'LOCAL';

/**
 * Choose the browser backend: Browserbase (residential proxies, better anti-bot
 * evasion) when its credentials are present, otherwise local Playwright/Chromium.
 * Mirrors the parking-ticket-pal worker. Force LOCAL with STAGEHAND_ENV=LOCAL.
 */
export const getBrowserEnv = (): BrowserEnv => {
  if (process.env.STAGEHAND_ENV?.toUpperCase() === 'LOCAL') return 'LOCAL';
  if (process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID) {
    return 'BROWSERBASE';
  }
  console.warn('[browser] Browserbase creds absent — using LOCAL Playwright');
  return 'LOCAL';
};

/**
 * Create + init a Stagehand instance. Stagehand drives the page with Claude for
 * its act/extract calls (ANTHROPIC_API_KEY). Caller MUST `await sh.close()`.
 */
export const createStagehand = async (): Promise<Stagehand> => {
  const env = getBrowserEnv();
  const sh = new Stagehand({
    env,
    ...(env === 'BROWSERBASE'
      ? {
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
        }
      : {}),
    // Stagehand's own act/extract LLM. Sonnet for cost (cron-frequency).
    modelName: 'anthropic/claude-sonnet-4-6',
    modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY },
    verbose: 1,
  });
  await sh.init();
  return sh;
};

// Browserbase's plan allows ONE concurrent session. The daily cron fires every
// source at once, so two Browserbase scrapers (jobserve + cwjobs) would collide →
// one 429s "max concurrent sessions limit (limit 1)" and ingests nothing. This
// global promise-chain mutex serialises the whole session lifecycle (init →
// work → close) so only one runs at a time. Adzuna (pure API, no Stagehand) is
// unaffected. In-process only — fine, the worker is a single instance.
let browserLock: Promise<unknown> = Promise.resolve();

/**
 * Run `fn` with a fresh Stagehand session, holding the global browser lock for the
 * whole run and always closing the session. Queues if another browser scrape is
 * in flight — preventing the Browserbase concurrent-session 429.
 */
export const withStagehand = async <T>(
  fn: (sh: Stagehand) => Promise<T>,
): Promise<T> => {
  const run = async (): Promise<T> => {
    const sh = await createStagehand();
    try {
      return await fn(sh);
    } finally {
      try {
        await sh.close();
      } catch (err) {
        console.error('[browser] error closing Stagehand session:', err);
      }
    }
  };
  // Chain onto the previous run regardless of its outcome.
  const result = browserLock.then(run, run);
  // Keep the chain alive without leaking rejections into the lock.
  browserLock = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};
