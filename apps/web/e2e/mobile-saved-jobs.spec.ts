import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type APIRequestContext, expect, test } from '@playwright/test';

// End-to-end for the mobile saved-jobs lifecycle, driven through the real
// /api/mobile/saved-jobs endpoints (bearer-auth, not cookie). This is the surface
// behind the app's heart toggle. It guards the bugs that bit in dev:
//   - unlike must actually DELETE (the "unliking doesn't work" direction bug)
//   - save then unsave must round-trip; the job must NOT come back
//   - the writes are idempotent (double-save / double-unsave are no-ops)
// The contractor's token is minted in e2e/seed-users.ts (global-setup) since the
// Prisma client can't load under Playwright's transform.

const TOKEN_FILE = path.join(__dirname, '.auth', 'mobile-token.json');

const readToken = (): string => {
  const { token } = JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as {
    token: string;
  };
  return token;
};

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const listSavedIds = async (
  request: APIRequestContext,
  token: string,
): Promise<string[]> => {
  const res = await request.get('/api/mobile/saved-jobs', {
    headers: auth(token),
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { saved: { job: { id: string } }[] };
  return body.saved.map((s) => s.job.id);
};

// Pull real, board-visible job ids the contractor can save.
const boardJobIds = async (
  request: APIRequestContext,
  n: number,
): Promise<string[]> => {
  const res = await request.get('/api/mobile/jobs');
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as { jobs: { id: string }[] };
  const ids = body.jobs.map((j) => j.id).slice(0, n);
  expect(ids.length, 'board should have jobs to save').toBeGreaterThanOrEqual(
    n,
  );
  return ids;
};

test.describe('mobile saved jobs', () => {
  test('requires auth', async ({ request }) => {
    const res = await request.get('/api/mobile/saved-jobs');
    expect(res.status()).toBe(401);
  });

  test('save → appears in the list → unsave → gone (and stays gone)', async ({
    request,
  }) => {
    const token = readToken();
    const [jobId] = await boardJobIds(request, 1);

    // Save it.
    const saveRes = await request.post('/api/mobile/saved-jobs', {
      headers: auth(token),
      data: { jobId },
    });
    expect(saveRes.status()).toBe(201);
    expect(await listSavedIds(request, token)).toContain(jobId);

    // Unsave it — THE direction that broke. Must DELETE, must remove it.
    const unsaveRes = await request.delete(`/api/mobile/saved-jobs/${jobId}`, {
      headers: auth(token),
    });
    expect(unsaveRes.ok()).toBeTruthy();
    expect(await listSavedIds(request, token)).not.toContain(jobId);

    // And it does NOT come back on a subsequent read.
    expect(await listSavedIds(request, token)).not.toContain(jobId);
  });

  test('unsaving one of several leaves the others (no resurrection)', async ({
    request,
  }) => {
    const token = readToken();
    const [a, b, c] = await boardJobIds(request, 3);

    for (const id of [a, b, c]) {
      const r = await request.post('/api/mobile/saved-jobs', {
        headers: auth(token),
        data: { jobId: id },
      });
      expect(r.status()).toBe(201);
    }
    expect(await listSavedIds(request, token)).toEqual(
      expect.arrayContaining([a, b, c]),
    );

    // Unsave the middle one — a + c must remain, b must be gone.
    await request.delete(`/api/mobile/saved-jobs/${b}`, {
      headers: auth(token),
    });
    const after = await listSavedIds(request, token);
    expect(after).toEqual(expect.arrayContaining([a, c]));
    expect(after).not.toContain(b);

    // clean up
    for (const id of [a, c]) {
      await request.delete(`/api/mobile/saved-jobs/${id}`, {
        headers: auth(token),
      });
    }
  });

  test('idempotent: double-save and double-unsave never error or duplicate', async ({
    request,
  }) => {
    const token = readToken();
    const [jobId] = await boardJobIds(request, 1);

    // Save twice — second is a no-op (the upsert), list has exactly one.
    await request.post('/api/mobile/saved-jobs', {
      headers: auth(token),
      data: { jobId },
    });
    const second = await request.post('/api/mobile/saved-jobs', {
      headers: auth(token),
      data: { jobId },
    });
    expect(second.status()).toBe(201);
    const ids = await listSavedIds(request, token);
    expect(ids.filter((id) => id === jobId)).toHaveLength(1);

    // Unsave twice — second is a no-op (deleteMany), never errors.
    const d1 = await request.delete(`/api/mobile/saved-jobs/${jobId}`, {
      headers: auth(token),
    });
    expect(d1.ok()).toBeTruthy();
    const d2 = await request.delete(`/api/mobile/saved-jobs/${jobId}`, {
      headers: auth(token),
    });
    expect(d2.ok()).toBeTruthy();
    expect(await listSavedIds(request, token)).not.toContain(jobId);
  });
});
