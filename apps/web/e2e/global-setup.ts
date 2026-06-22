import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { CONTRACTOR_EMAIL, loginAs, POSTER_EMAIL } from './helpers/auth';

// Runs once before the suite, after the webServer is up. Seeds the two test
// users (in a separate `tsx` process — the Prisma client can't load under
// Playwright's TS transform) and writes a signed-in storageState for each role.
// The authed test projects (see playwright.config.ts) load these so each test
// starts already authenticated as the correct role.

export const CONTRACTOR_STATE = path.join(
  __dirname,
  '.auth',
  'contractor.json',
);
export const POSTER_STATE = path.join(__dirname, '.auth', 'poster.json');

const globalSetup = async (): Promise<void> => {
  const baseURL = `http://localhost:${process.env.E2E_PORT ?? 3100}`;

  // Seed via tsx so the generated Prisma client loads in a real Node/CJS context.
  execFileSync('pnpm', ['exec', 'tsx', path.join(__dirname, 'seed-users.ts')], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });

  await loginAs(baseURL, CONTRACTOR_EMAIL, CONTRACTOR_STATE);
  await loginAs(baseURL, POSTER_EMAIL, POSTER_STATE);
};

export default globalSetup;
