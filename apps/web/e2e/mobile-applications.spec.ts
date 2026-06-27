import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type APIRequestContext, expect, test } from '@playwright/test';

// End-to-end for the My Jobs > Applications tab: apply to a NATIVE listing via
// /api/mobile/applications, then read it back from /api/mobile/applications/list
// (job card + applied date + viewed flag). Bearer-auth; token from seed-users.ts.

const TOKEN_FILE = path.join(__dirname, '.auth', 'mobile-token.json');

const readToken = (): string =>
  (JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token: string }).token;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

type AppRow = {
  appliedAt: string;
  viewed: boolean;
  job: { id: string; position: string };
};

const listApplications = async (
  request: APIRequestContext,
  token: string,
): Promise<AppRow[]> => {
  const res = await request.get('/api/mobile/applications/list', {
    headers: auth(token),
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { applications: AppRow[] }).applications;
};

// Find a NATIVE, applyable job id. The mobile job detail carries `source`; the
// seed includes NATIVE active roles. Returns null if none (skips the round-trip).
const findApplyableJobId = async (
  request: APIRequestContext,
): Promise<string | null> => {
  const board = await request.get('/api/mobile/jobs');
  expect(board.ok()).toBeTruthy();
  const { jobs } = (await board.json()) as {
    jobs: { id: string; source: string }[];
  };
  for (const j of jobs) {
    if (j.source === 'NATIVE') return j.id;
  }
  return null;
};

test.describe('mobile applications', () => {
  test('requires auth', async ({ request }) => {
    const res = await request.get('/api/mobile/applications/list');
    expect(res.status()).toBe(401);
  });

  test('apply to a native listing → it appears in the applications list', async ({
    request,
  }) => {
    const token = readToken();
    const jobId = await findApplyableJobId(request);
    test.skip(!jobId, 'no NATIVE applyable job in the seed');

    const applyRes = await request.post('/api/mobile/applications', {
      headers: auth(token),
      data: { jobId, message: 'e2e application probe' },
    });
    // 201 created, or 409/4xx if a prior run already applied (unique constraint) —
    // either way it should then be in the list.
    expect([200, 201, 409]).toContain(applyRes.status());

    const apps = await listApplications(request, token);
    const mine = apps.find((a) => a.job.id === jobId);
    expect(mine, 'the applied job should be in the list').toBeTruthy();
    expect(mine?.viewed).toBe(false);
    expect(typeof mine?.appliedAt).toBe('string');
  });
});
