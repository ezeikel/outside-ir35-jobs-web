import 'server-only';
import { jwtVerify, SignJWT } from 'jose';

/**
 * Mobile session tokens. The web app authenticates browsers with NextAuth's
 * cookie-based JWT session; native apps can't use cookies cleanly, so the mobile
 * routes mint a SEPARATE bearer token here and the RN app sends it as
 * `Authorization: Bearer <token>`.
 *
 * It's a JWT signed (HS256) with the same AUTH_SECRET, carrying only the userId
 * + email. Authed mobile routes verify it to resolve the caller, exactly as the
 * web routes resolve `auth()`. Keeping it separate from the NextAuth cookie keeps
 * the two surfaces from interfering.
 */

const ISSUER = 'outsideir35.jobs';
const AUDIENCE = 'outsideir35.jobs/mobile';
// Long-lived: a native app shouldn't silently sign the user out. 90 days; the
// app re-validates against /api/mobile/auth/me on every cold start.
const TTL = '90d';

const secret = (): Uint8Array => {
  const s = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set — cannot sign mobile tokens');
  return new TextEncoder().encode(s);
};

export type MobileTokenClaims = {
  userId: string;
  email: string;
};

export const mintMobileSessionToken = async (
  claims: MobileTokenClaims,
): Promise<string> =>
  new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secret());

/**
 * Verify a bearer token and return its claims, or null if absent/invalid/expired.
 * Routes call this instead of `auth()` to authorise a mobile caller.
 */
export const verifyMobileSessionToken = async (
  token: string | null | undefined,
): Promise<MobileTokenClaims | null> => {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
};

/** Pull the bearer token out of an Authorization header. */
export const bearerFromHeader = (header: string | null): string | null => {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
};
