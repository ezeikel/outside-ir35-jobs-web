import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mintMobileSessionToken } from '@/lib/mobile/session';

// DEV/TEST-ONLY sign-in seam for the mobile app. Mints a real bearer token for a
// seeded test user WITHOUT going through Google/Apple OAuth, so the simulator (and
// Maestro flows) can drive the authed surfaces deterministically. Mirrors the
// web's E2E_TEST_LOGIN credentials provider (auth.ts).
//
// HARD-GATED: only responds when E2E_TEST_LOGIN === '1'. That env var is never set
// in production (Vercel prod doesn't define it), so this route 404s for real users.
export const runtime = 'nodejs';

const enabled = process.env.E2E_TEST_LOGIN === '1';

// The seeded test users (see e2e/seed-users.ts). Pick by role.
const TEST_USERS = {
  seeker: 'e2e-contractor@outsideir35.test',
  poster: 'e2e-poster@outsideir35.test',
} as const;

const Body = z.object({
  role: z.enum(['seeker', 'poster']).default('seeker'),
});

export const POST = async (req: Request) => {
  if (!enabled) {
    // Indistinguishable from a non-existent route in prod.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = TEST_USERS[parsed.data.role];
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardedAt: true,
    },
  });
  if (!user) {
    return NextResponse.json(
      { error: `Test user ${email} not seeded` },
      { status: 404 },
    );
  }

  const token = await mintMobileSessionToken({
    userId: user.id,
    email: user.email,
  });

  return NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboarded: !!user.onboardedAt,
    },
  });
};
