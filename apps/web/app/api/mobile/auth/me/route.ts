import { NextResponse } from 'next/server';
import { getMobileCaller } from '@/lib/mobile/auth';

// Returns the current mobile user for the bearer token, or 401 if the token is
// missing/invalid/expired. The RN app calls this on cold start to validate the
// stored session and refresh role/onboarded.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: caller.userId,
      email: caller.email,
      name: caller.name,
      role: caller.role,
      onboarded: caller.onboarded,
    },
  });
};
