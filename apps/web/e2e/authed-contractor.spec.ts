import { expect, type Page, test } from '@playwright/test';

// Authenticated happy paths for a contractor (JOB_SEEKER). Signed in via the
// storageState minted in global-setup — these run under the `contractor`
// project. They prove the verified-profile/alerts/premium/apply surfaces render
// the right controls for a logged-in contractor (the role-gated pages a
// signed-out visitor only gets redirected away from).

const trackErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  return errors;
};

test('contractor lands on /profile (not redirected to login/onboarding)', async ({
  page,
}) => {
  const errors = trackErrors(page);
  await page.goto('/profile');
  // Onboarded contractor: stays on /profile, never bounced to signin/onboarding.
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByText(/api\/auth\/signin/)).toHaveCount(0);
  // Empty-state (no profile data yet) shows the build-your-profile CTA; a
  // populated profile renders the ContractorProfile component. Either is a pass
  // as long as the page rendered without erroring.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});

test('contractor reaches /premium and sees the subscribe control', async ({
  page,
}) => {
  await page.goto('/premium');
  await expect(page).toHaveURL(/\/premium$/);
  await expect(
    page.getByRole('heading', { name: /win and deliver more contracts/i }),
  ).toBeVisible();
  // Either "Subscribe — £29/month" (not subscribed) or "Manage subscription"
  // (already active) — both prove the gated page rendered for this contractor.
  await expect(
    page
      .getByRole('button', {
        name: /subscribe — £29\/month|manage subscription/i,
      })
      .first(),
  ).toBeVisible();
});

test('contractor can save a search, then pause and delete it', async ({
  page,
}) => {
  // Drive the real save flow from the board so the round-trip is exercised
  // end-to-end (server action → DB → /alerts render → toggle → delete).
  await page.goto('/jobs?q=e2e-saved-search-probe&ir35=outside');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // The "Save this search" control lives on the board for signed-in contractors.
  const saveBtn = page.getByRole('button', { name: /save (this )?search/i });
  await expect(saveBtn).toBeVisible({ timeout: 15_000 });
  await saveBtn.click();

  // WAIT for the save to actually complete before navigating — the button is a
  // useTransition calling the server action, so the click returns before the
  // write lands. Its success state ("Saved — we'll email you…") confirms it.
  await expect(page.getByText(/saved — we’ll email you/i)).toBeVisible({
    timeout: 15_000,
  });

  // It now shows on /alerts. A prod build can serve a cached /alerts before the
  // save's revalidatePath propagates — reload until the row appears.
  await expect(async () => {
    await page.goto('/alerts');
    await expect(
      page.getByRole('heading', { name: /job alerts/i }),
    ).toBeVisible();
    await expect(page.getByText('e2e-saved-search-probe').first()).toBeVisible({
      timeout: 3_000,
    });
  }).toPass({ timeout: 20_000 });

  // Pause it — the status line flips and the button toggles to Resume.
  const card = page
    .locator('li')
    .filter({ hasText: 'e2e-saved-search-probe' })
    .first();
  await card.getByRole('button', { name: /^pause$/i }).click();
  await expect(card.getByText(/alerts paused/i)).toBeVisible();

  // Delete it — the row disappears (clean up the probe so re-runs stay idempotent).
  await card.getByRole('button', { name: /^delete$/i }).click();
  await expect(page.getByText('e2e-saved-search-probe')).toHaveCount(0, {
    timeout: 15_000,
  });
});

test('contractor sees an apply control on a native, active listing', async ({
  page,
}) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Collect the real listing hrefs up front (excluding /job/post, the header's
  // "Post a job" link). Navigate to each directly rather than clicking a stale
  // locator after re-rendering the board.
  const hrefs = await page
    .locator('a[href^="/job/"]:not([href="/job/post"])')
    .evaluateAll((els) =>
      (els as HTMLAnchorElement[])
        .map((a) => a.getAttribute('href'))
        .filter((h): h is string => !!h),
    );
  // Scan all distinct listings — the board sorts newest-first, so aggregated
  // (link-out) roles from the worker can crowd the top; the apply-able NATIVE
  // seed roles may sit further down. The board is small (tens of rows), so this
  // is cheap and deterministic.
  const candidates = [...new Set(hrefs)];

  // The seed includes NATIVE active roles, so at least one is apply-able.
  let foundApply = false;
  for (const href of candidates) {
    await page.goto(href);
    await expect(page).toHaveURL(/\/job\//);

    // A signed-in contractor on an apply-able native role sees the verified-
    // profile apply button; an aggregated role shows "Apply on the original
    // listing". We must NEVER see "Sign in to apply" (that's the signed-out copy)
    // — its absence proves the session is live on the listing page.
    await expect(page.getByText(/sign in to apply/i)).toHaveCount(0);

    if (
      await page
        .getByRole('button', { name: /apply with verified profile/i })
        .count()
    ) {
      foundApply = true;
      // Don't actually submit — asserting the control + helper copy is the
      // happy-path signal; a real apply would write an Application row.
      await expect(
        page.getByText(/share your verified compliance pack/i),
      ).toBeVisible();
      break;
    }
  }

  expect(
    foundApply,
    'expected at least one native active listing with an apply button',
  ).toBe(true);
});
