import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// global-setup seeds the dev DB via the Prisma client, which throws at import
// unless DATABASE_URL is set. Playwright's own process doesn't auto-load
// .env.local (only the spawned `next start` does), so load it here — same file
// packages/db/prisma.config.ts reads.
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

// E2E for the outsideir35.jobs web app. Boots a production build on a dedicated
// port and drives both the public flows (browse → open a listing → day-rates →
// blog → legal, guarding regressions like the Maps-script 500) and the
// authenticated happy paths (apply, post-a-job, alerts, premium). Authed tests
// sign in via an E2E-only NextAuth credentials provider (see auth.ts +
// e2e/global-setup.ts) — never the real Google OAuth screen.
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

const CONTRACTOR_STATE = path.join(
  __dirname,
  'e2e',
  '.auth',
  'contractor.json',
);
const POSTER_STATE = path.join(__dirname, 'e2e', '.auth', 'poster.json');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  // Seeds the test users + writes a signed-in storageState per role before any
  // test runs (after the webServer is up).
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // Signed-out public surfaces. No storageState — a fresh, anonymous context.
    {
      name: 'public',
      testMatch: /public-flows\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Contractor (JOB_SEEKER) authed flows: apply, alerts, premium, profile.
    {
      name: 'contractor',
      testMatch: /authed-contractor\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: CONTRACTOR_STATE },
    },
    // Poster (JOB_POSTER) authed flows: dashboard, post-a-job.
    {
      name: 'poster',
      testMatch: /authed-poster\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: POSTER_STATE },
    },
  ],
  // Run against a PRODUCTION build, not `next dev`. The jsdom ERR_REQUIRE_ESM
  // 500 that broke every /job/[id] page only manifested in the production
  // bundle/runtime — `next dev` rendered it fine. Building + starting here is
  // what makes the "open a listing" guard able to catch that class of
  // regression. E2E_TEST_LOGIN=1 turns on the test-only credentials provider so
  // global-setup can sign in. Reuses an already-running server locally so the
  // build isn't repeated needlessly.
  webServer: {
    command: `pnpm build && E2E_TEST_LOGIN=1 pnpm start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
    env: { E2E_TEST_LOGIN: '1' },
  },
});
