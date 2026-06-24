import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileCaller } from '@/lib/mobile/auth';

// Register a device's FCM token for push, keyed to the signed-in user. The app
// calls this after sign-in (and on token refresh). Reconciles the token to the
// caller (clearing it from any other user's row — reinstall / account switch),
// then upserts by fcmToken. Bearer-auth.
export const runtime = 'nodejs';

const Body = z.object({
  fcmToken: z.string().min(20).max(4096),
  platform: z.enum(['ios', 'android']),
  timezone: z.string().max(64).optional(),
});

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { fcmToken, platform, timezone } = parsed.data;

  // If this token was registered to a DIFFERENT user (shared device / account
  // switch / restore), move it to the current user rather than collide on the
  // unique fcmToken.
  await prisma.pushSubscription.deleteMany({
    where: { fcmToken, NOT: { userId: caller.userId } },
  });

  await prisma.pushSubscription.upsert({
    where: { fcmToken },
    create: {
      userId: caller.userId,
      fcmToken,
      platform,
      timezone: timezone ?? 'UTC',
    },
    update: {
      userId: caller.userId,
      platform,
      timezone: timezone ?? 'UTC',
      enabled: true,
    },
  });

  return NextResponse.json({ ok: true });
};
