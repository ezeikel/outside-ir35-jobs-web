import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type APIRequestContext, expect, test } from '@playwright/test';

// End-to-end for the named, multi-version CV lifecycle via /api/mobile/cvs
// (bearer-auth). The mobile CVManager drives these: upload (named from the picked
// file), list, set-active (drives matching), rename, delete (promotes another to
// active, or clears the profile if it was the last). Token minted in seed-users.ts.

const TOKEN_FILE = path.join(__dirname, '.auth', 'mobile-token.json');

const readToken = (): string =>
  (JSON.parse(readFileSync(TOKEN_FILE, 'utf8')) as { token: string }).token;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// A minimal valid PDF (Claude/parse never runs in e2e — the worker URL isn't set,
// so the upload just stores the file + creates the row; that's what we assert).
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
    'trailer<</Root 1 0 R>>\n%%EOF\n',
);

type CV = { id: string; name: string; isActive: boolean };

const listCVs = async (
  request: APIRequestContext,
  token: string,
): Promise<CV[]> => {
  const res = await request.get('/api/mobile/cvs', { headers: auth(token) });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { cvs: CV[] }).cvs;
};

const uploadCV = async (
  request: APIRequestContext,
  token: string,
  name: string,
) => {
  const res = await request.post('/api/mobile/cvs', {
    headers: auth(token),
    multipart: {
      name,
      file: { name: `${name}.pdf`, mimeType: 'application/pdf', buffer: PDF },
    },
  });
  return res;
};

const clearCVs = async (request: APIRequestContext, token: string) => {
  for (const cv of await listCVs(request, token)) {
    await request.delete(`/api/mobile/cvs/${cv.id}`, { headers: auth(token) });
  }
};

test.describe('mobile CVs', () => {
  test.beforeEach(async ({ request }) => {
    await clearCVs(request, readToken());
  });

  test('requires auth', async ({ request }) => {
    const res = await request.get('/api/mobile/cvs');
    expect(res.status()).toBe(401);
  });

  test('upload makes a CV that is active by default', async ({ request }) => {
    const token = readToken();
    const res = await uploadCV(request, token, 'Backend / Go');
    expect(res.status()).toBe(201);

    const cvs = await listCVs(request, token);
    expect(cvs).toHaveLength(1);
    expect(cvs[0].name).toBe('Backend / Go');
    expect(cvs[0].isActive).toBe(true);
  });

  test('a new upload becomes active and deactivates the previous', async ({
    request,
  }) => {
    const token = readToken();
    await uploadCV(request, token, 'First');
    await uploadCV(request, token, 'Second');

    const cvs = await listCVs(request, token);
    expect(cvs).toHaveLength(2);
    const active = cvs.filter((c) => c.isActive);
    expect(active).toHaveLength(1);
    expect(active[0].name).toBe('Second');
  });

  test('set-active switches which CV drives matching', async ({ request }) => {
    const token = readToken();
    await uploadCV(request, token, 'First');
    await uploadCV(request, token, 'Second'); // active
    const cvs = await listCVs(request, token);
    const first = cvs.find((c) => c.name === 'First');
    expect(first).toBeTruthy();

    const res = await request.patch(`/api/mobile/cvs/${first?.id}`, {
      headers: auth(token),
      data: { isActive: true },
    });
    expect(res.ok()).toBeTruthy();

    const after = await listCVs(request, token);
    expect(after.find((c) => c.name === 'First')?.isActive).toBe(true);
    expect(after.find((c) => c.name === 'Second')?.isActive).toBe(false);
  });

  test('rename updates the name', async ({ request }) => {
    const token = readToken();
    await uploadCV(request, token, 'Old name');
    const [cv] = await listCVs(request, token);

    const res = await request.patch(`/api/mobile/cvs/${cv.id}`, {
      headers: auth(token),
      data: { name: 'New name' },
    });
    expect(res.ok()).toBeTruthy();
    expect((await listCVs(request, token))[0].name).toBe('New name');
  });

  test('deleting the active CV promotes another to active', async ({
    request,
  }) => {
    const token = readToken();
    await uploadCV(request, token, 'First');
    await uploadCV(request, token, 'Second'); // active
    const cvs = await listCVs(request, token);
    const second = cvs.find((c) => c.name === 'Second');

    await request.delete(`/api/mobile/cvs/${second?.id}`, {
      headers: auth(token),
    });

    const after = await listCVs(request, token);
    expect(after).toHaveLength(1);
    expect(after[0].name).toBe('First');
    expect(after[0].isActive).toBe(true); // promoted
  });
});
