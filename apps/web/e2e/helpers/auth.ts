import { request as playwrightRequest } from '@playwright/test';

// Auth harness for the authed-flow e2e suite. NextAuth here is Google-only in
// production; for tests we rely on the E2E-only Credentials provider (id 'e2e')
// in auth.ts, which is registered ONLY when E2E_TEST_LOGIN === '1'. We mint a
// real signed session cookie for each seeded user by driving NextAuth's own
// csrf → callback endpoints. The resulting storageState is what each test
// project loads, so tests start already signed in as the right role — no Google
// consent screen involved.
//
// NOTE: the DB seed lives in e2e/seed-users.ts (run via `tsx` as a separate
// process by global-setup), NOT here — importing the Prisma client into
// Playwright's TS transform breaks on the generated client's CommonJS output.

// Stable, obviously-synthetic emails so a seed re-run upserts rather than
// duplicating, and so these rows are easy to spot/clean in the dev DB. Kept in
// sync with e2e/seed-users.ts.
export const CONTRACTOR_EMAIL = 'e2e-contractor@outsideir35.test';
export const POSTER_EMAIL = 'e2e-poster@outsideir35.test';

/**
 * Sign in as `email` through the E2E credentials provider and persist the
 * session to `storageStatePath`. Uses an isolated Playwright request context so
 * cookies (csrf + session) are captured, then written out as storageState.
 *
 * The flow mirrors what a browser does for next-auth credentials sign-in:
 *   1. GET /api/auth/csrf            → csrfToken (+ sets the csrf cookie)
 *   2. POST /api/auth/callback/e2e   → validates csrf, runs authorize(), sets
 *                                      the session-token cookie on success.
 */
export const loginAs = async (
  baseURL: string,
  email: string,
  storageStatePath: string,
): Promise<void> => {
  const ctx = await playwrightRequest.newContext({ baseURL });

  const csrfRes = await ctx.get('/api/auth/csrf');
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const res = await ctx.post('/api/auth/callback/e2e', {
    form: {
      csrfToken,
      email,
      callbackUrl: `${baseURL}/`,
      json: 'true',
    },
    // Do NOT follow the redirect. next-auth answers a successful credentials
    // sign-in with a 302 whose Location is the (env-derived) site URL, and whose
    // Set-Cookie carries the session token. The cookie is already applied to
    // this request context by the time we see the 302 — following the redirect
    // just tries to GET a URL that may not be this test server (ECONNREFUSED).
    maxRedirects: 0,
  });

  // The 302 is the success signal; the session cookie is on the context now. If
  // we never got a session cookie, sign-in failed — fail loudly here rather than
  // in every test.
  const cookies = await ctx.storageState();
  const hasSession = cookies.cookies.some((c) =>
    c.name.includes('authjs.session-token'),
  );
  if (!hasSession) {
    throw new Error(
      `E2E login failed for ${email} (status ${res.status()}). Is E2E_TEST_LOGIN=1 set for the web server, and is the user seeded?`,
    );
  }

  await ctx.storageState({ path: storageStatePath });
  await ctx.dispose();
};
