import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  upsertUserForIdentity,
  verifyAppleIdentityToken,
} from '@/lib/mobile/oauth';
import { mintMobileSessionToken } from '@/lib/mobile/session';

// Native Apple sign-in: the RN app sends Apple's identityToken (+ the name, which
// Apple only returns on first sign-in). We verify against Apple's JWKS, find-or-
// create the user, mint a mobile session token, and return it + the user.
export const runtime = 'nodejs';

const Body = z.object({
  identityToken: z.string().min(1),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
});

export const POST = async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'identityToken required' },
      { status: 400 },
    );
  }

  let identity;
  try {
    identity = await verifyAppleIdentityToken(parsed.data.identityToken, {
      givenName: parsed.data.givenName,
      familyName: parsed.data.familyName,
    });
  } catch {
    return NextResponse.json({ error: 'Invalid Apple token' }, { status: 401 });
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
