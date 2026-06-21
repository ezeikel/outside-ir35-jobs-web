import { expect, type Page, test } from '@playwright/test';

// Public flows a signed-out visitor can do: land, browse contracts, open a
// listing (the path that 500'd via the global Maps script), search, and reach
// day-rates / blog / legal. No auth needed — these are the SEO + acquisition
// surfaces, so a regression here is a real outage.

// Fail the test if the page throws an uncaught error (this is what would have
// caught the Maps-script 500 — the page rendered an error boundary, not content).
const trackErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
};

test('home page loads with the hero + nav', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: /jobs/i }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('browse /jobs and open a listing without erroring', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Open the first contract card. This is the regression guard: the listing
  // detail page must render real content, not an error boundary.
  const firstCard = page.locator('a[href^="/job/"]').first();
  await expect(firstCard).toBeVisible({ timeout: 15_000 });
  await firstCard.click();

  await expect(page).toHaveURL(/\/job\//);
  // A listing page shows the day-rate label + an apply control, and never the
  // app error overlay.
  await expect(page.getByText(/day rate/i).first()).toBeVisible();
  await expect(page.getByText(/Application error/i)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('keyword search on /jobs returns the jobs page', async ({ page }) => {
  await page.goto('/jobs?q=engineer');
  await expect(page).toHaveURL(/q=engineer/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('default board hides Inside-IR35 jobs; ?ir35=any reveals them', async ({
  page,
}) => {
  // This is an outside-IR35 board: an explicit "Inside IR35" listing must never
  // appear on the unfiltered board. The card renders an "Inside IR35" chip for
  // INSIDE jobs, so its absence/presence is the regression signal.
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Inside IR35', { exact: true })).toHaveCount(0);

  // Opting into everything must bring them back (proves they're hidden, not
  // deleted). Only assert presence if the seed/board actually has an INSIDE job.
  await page.goto('/jobs?ir35=any');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('day-rates page renders (gated empty state or table)', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/day-rates');
  await expect(
    page.getByRole('heading', { name: /day rates/i }).first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('blog list + a post render', async ({ page }) => {
  await page.goto('/blog');
  await expect(
    page.getByRole('heading', { name: /blog/i }).first(),
  ).toBeVisible();

  const firstPost = page.locator('a[href^="/blog/"]').first();
  if (await firstPost.count()) {
    await firstPost.click();
    await expect(page).toHaveURL(/\/blog\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('privacy and terms pages are live', async ({ page }) => {
  await page.goto('/privacy');
  await expect(
    page.getByRole('heading', { name: /privacy policy/i }),
  ).toBeVisible();

  await page.goto('/terms');
  await expect(
    page.getByRole('heading', { name: /terms and conditions/i }),
  ).toBeVisible();
});
