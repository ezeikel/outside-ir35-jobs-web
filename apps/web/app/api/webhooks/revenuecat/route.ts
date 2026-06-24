import { timingSafeEqual } from 'node:crypto';
import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { shouldProviderWriteWin } from '@/lib/contractor/premium';
import {
  mapRevenueCatEvent,
  type RevenueCatWebhookBody,
} from '@/lib/mobile/revenuecat';

// Constant-time comparison of the shared secret (the only gate granting paid
// access). length-guard first — timingSafeEqual throws on unequal lengths.
const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

// RevenueCat webhook — the source of truth for MOBILE premium. RC notifies us of
// purchases / renewals / cancellations / expirations; we write the normalised
// status + period onto the user's Subscription row (provider=REVENUECAT), and
// isPremium() then unlocks every gate (incl. the mobile saved-searches route)
// exactly as it does for a web Stripe sub. Integration boundary → lives in a
// route, not an action (like the Stripe webhook).
export const runtime = 'nodejs';

export const POST = async (req: Request) => {
  // RevenueCat sends the shared secret you set in the dashboard as the
  // Authorization header. Reject anything that doesn't match.
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) {
    // Misconfigured server — fail closed (never process an unverifiable event).
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (!safeEqual(req.headers.get('authorization') ?? '', expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RevenueCatWebhookBody;
  try {
    body = (await req.json()) as RevenueCatWebhookBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = body?.event;
  if (!event?.type) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  const sync = mapRevenueCatEvent(event);
  // Events we don't act on (TEST, alias, transfer, anonymous) — ack so RC stops
  // retrying.
  if (!sync) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  // The app_user_id is the DB user id; only write if that user actually exists.
  // Also read the existing row so we can refuse to clobber an actively-paying
  // sub from the OTHER channel (one row per user — last-writer-wins would
  // otherwise let a stale RC event revoke a live Stripe subscriber).
  const [user, existing] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sync.userId },
      select: { id: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: sync.userId },
      select: { provider: true, status: true, currentPeriodEnd: true },
    }),
  ]);
  if (!user) {
    // Unknown user — ack (don't make RC retry forever) but record nothing.
    return NextResponse.json({ ok: true, ignored: 'unknown_user' });
  }

  if (!shouldProviderWriteWin(existing, 'REVENUECAT')) {
    // A different provider currently owns a live premium for this user — don't
    // let an idle-channel event downgrade them. Ack so RC stops retrying.
    return NextResponse.json({ ok: true, ignored: 'other_provider_active' });
  }

  const data = {
    type: 'PRO' as const,
    provider: 'REVENUECAT' as const,
    revenueCatUserId: sync.userId,
    revenueCatProductId: sync.revenueCatProductId,
    // Clear the Stripe linkage when RevenueCat takes ownership so the row is
    // never internally inconsistent (a REVENUECAT row with stale Stripe ids).
    stripeSubscriptionId: null,
    stripePriceId: null,
    status: sync.status,
    currentPeriodEnd: sync.currentPeriodEnd,
    cancelAtPeriodEnd: sync.cancelAtPeriodEnd,
  };

  // Upsert is idempotent — RC delivers at-least-once, and re-writing the same
  // status/period is a no-op. One row per user (userId @unique).
  await prisma.subscription.upsert({
    where: { userId: sync.userId },
    create: { userId: sync.userId, ...data },
    update: data,
  });

  return NextResponse.json({ ok: true });
};
