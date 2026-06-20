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
