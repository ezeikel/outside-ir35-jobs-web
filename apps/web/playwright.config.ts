import { defineConfig, devices } from '@playwright/test';

// E2E for the outsideir35.jobs web app. Boots `next dev` on a dedicated port and
// drives the public flows (browse → open a listing → day-rates → blog → legal),
// guarding regressions like the Maps-script 500 that broke every listing page.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Run against a PRODUCTION build, not `next dev`. The jsdom ERR_REQUIRE_ESM
  // 500 that broke every /job/[id] page only manifested in the production
  // bundle/runtime — `next dev` rendered it fine. Building + starting here is
  // what makes the "open a listing" guard able to catch that class of
  // regression. Reuses an already-running server locally (e.g. `next start` on
  // this port) so the build isn't repeated needlessly.
  webServer: {
    command: `pnpm build && pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
