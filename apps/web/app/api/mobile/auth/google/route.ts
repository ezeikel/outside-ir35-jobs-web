import { NextResponse } from 'next/server';
import { z } from 'zod';
import { upsertUserForIdentity, verifyGoogleIdToken } from '@/lib/mobile/oauth';
import { mintMobileSessionToken } from '@/lib/mobile/session';

// Native Google sign-in: the RN app sends the Google idToken; we verify it,
// find-or-create the user (same as the web NextAuth signIn callback), mint a
// mobile session token, and return it + the user.
export const runtime = 'nodejs';

const Body = z.object({ idToken: z.string().min(1) });

export const POST = async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'idToken required' }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(parsed.data.idToken);
  } catch {
    return NextResponse.json(
      { error: 'Invalid Google token' },
      { status: 401 },
    );
  }

  const user = await upsertUserForIdentity(identity);
  const sessionToken = await mintMobileSessionToken({
    userId: user.id,
    email: user.email,
  });

  return NextResponse.json({
    sessionToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name || null,
      role: user.role ?? null,
      onboarded: !!user.onboardedAt,
    },
  });
};
