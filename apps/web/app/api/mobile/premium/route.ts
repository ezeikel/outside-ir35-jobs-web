import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { isPremium } from '@/lib/contractor/premium';
import { getMobileCaller } from '@/lib/mobile/auth';

// Authoritative premium state for the mobile app — read from the DB, NOT the
// RevenueCat client SDK. This is what lets a web Stripe subscriber be recognised
// as premium on mobile (and vice-versa): both providers write the same
// Subscription row, and isPremium() reads status + currentPeriodEnd regardless of
// channel. The app calls this after a purchase (and on load) and gates on it.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json({
      isPremium: false,
      status: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      provider: null,
    });
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: caller.userId },
    select: {
      status: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
      provider: true,
    },
  });

  return NextResponse.json({
    isPremium: isPremium(sub),
    status: sub?.status ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd
      ? sub.currentPeriodEnd.toISOString()
      : null,
    cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
    provider: sub?.provider ?? null,
  });
};
