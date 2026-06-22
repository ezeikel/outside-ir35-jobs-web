import 'server-only';
import { db as prisma } from '@outside-ir35-jobs/db';
import type { Role } from '@outside-ir35-jobs/db/types';
import {
  bearerFromHeader,
  verifyMobileSessionToken,
} from '@/lib/mobile/session';

/**
 * Resolve the signed-in mobile caller from a request's Authorization header.
 * The mobile equivalent of the web's `auth()` — every authed /api/mobile/* route
 * calls this to get the current user (and 401 if null). Re-reads role/onboarded
 * from the DB (not the token) so they're always fresh, exactly like the web
 * session callback.
 */

export type MobileCaller = {
  userId: string;
  email: string;
  role: Role | null;
  onboarded: boolean;
  name: string | null;
};

export const getMobileCaller = async (
  req: Request,
): Promise<MobileCaller | null> => {
  const token = bearerFromHeader(req.headers.get('authorization'));
  const claims = await verifyMobileSessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardedAt: true,
    },
  });
  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role ?? null,
    onboarded: !!user.onboardedAt,
  };
};
