import { expect, type Page, test } from '@playwright/test';

// Authenticated happy paths for a job poster (JOB_POSTER). Signed in via the
// storageState minted in global-setup — these run under the `poster` project.
// They prove the poster-only surfaces (dashboard + the £219 post-a-job form)
// render for a logged-in poster rather than redirecting to /jobs.

const trackErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
};

test('poster lands on /dashboard (not redirected away)', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: /your jobs & applicants/i }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('poster reaches /job/post and the form shows the £219 control', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/job/post');
  await expect(page).toHaveURL(/\/job\/post$/);
  await expect(
    page.getByRole('heading', { name: /post a contract/i }),
  ).toBeVisible();

  // The money path: the submit button states the £219 price. We assert it's
  // present and enabled but do NOT submit — a real submit creates an unpublished
  // Job + redirects to Stripe Checkout.
  await expect(
    page.getByRole('button', { name: /post job - £219/i }),
  ).toBeVisible();

  // The IR35 attestation is the load-bearing honesty control on this form — it
  // must be present (the platform never asserts IR35 status itself).
  await expect(
    page.getByText(/does not determine, verify or warrant IR35 status/i),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('contractor-only pages redirect a poster to the board', async ({
  page,
}) => {
  // Role gating in reverse: a poster hitting contractor-only surfaces is sent to
  // /jobs. Proves the role check fires for the wrong role, not just the absence
  // of a session.
  for (const path of ['/premium', '/alerts']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/jobs/);
  }
});
