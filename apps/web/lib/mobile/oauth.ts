import 'server-only';
import { db as prisma } from '@outside-ir35-jobs/db';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * Server-side verification of the native OAuth tokens the mobile app sends, and
 * the find-or-create user upsert. This mirrors the NextAuth `signIn` callback in
 * auth.ts (first sign-in creates a provisional user with NO role; the user picks
 * contractor vs hiring at onboarding) so web and mobile produce identical users.
 */

export type VerifiedIdentity = {
  email: string;
  name: string | null;
};

// ── Google ──
// Verify the idToken came from Google and was minted for our OAuth client. We
// accept any of the configured client IDs (web client mints the token the RN
// SDK returns; iOS/android client ids are also valid audiences).
const googleClient = new OAuth2Client();

const googleAudiences = (): string[] =>
  [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_MOBILE_WEB_CLIENT_ID,
    process.env.GOOGLE_MOBILE_IOS_CLIENT_ID,
    process.env.GOOGLE_MOBILE_ANDROID_CLIENT_ID,
  ].filter((v): v is string => !!v);

export const verifyGoogleIdToken = async (
  idToken: string,
): Promise<VerifiedIdentity> => {
  const audience = googleAudiences();
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audience.length ? audience : undefined,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error('Google token has no verified email');
  }
  return { email: payload.email, name: payload.name ?? null };
};

// ── Apple ──
// Verify the identityToken against Apple's public JWKS, checking issuer +
// audience (our app's bundle id). Apple only returns the name on first sign-in,
// so the route passes it through separately.
const appleJwks = createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys'),
);

const appleAudiences = (): string[] =>
  (process.env.APPLE_BUNDLE_IDS ?? 'com.chewybytes.outsideir35jobs.app')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const verifyAppleIdentityToken = async (
  identityToken: string,
  fullName?: { givenName?: string; familyName?: string },
): Promise<VerifiedIdentity> => {
  const { payload } = await jwtVerify(identityToken, appleJwks, {
    issuer: 'https://appleid.apple.com',
    audience: appleAudiences(),
  });
  const email = typeof payload.email === 'string' ? payload.email : null;
  if (!email) throw new Error('Apple token has no email');
  const name =
    [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ') ||
    null;
  return { email, name };
};

/**
 * Find-or-create the user for a verified identity. Same semantics as the
 * NextAuth signIn callback: existing user → returned as-is; first sign-in →
 * provisional user with role=null, onboardedAt=null.
 */
export const upsertUserForIdentity = async (identity: VerifiedIdentity) => {
  const existing = await prisma.user.findUnique({
    where: { email: identity.email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardedAt: true,
    },
  });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      email: identity.email,
      name: identity.name ?? '',
      role: null,
      onboardedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardedAt: true,
    },
  });
};
