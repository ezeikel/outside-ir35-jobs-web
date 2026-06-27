import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileProfile } from '@/lib/mobile/profile-dto';

// The signed-in contractor's verified profile (the moat) for mobile. Same data +
// honesty model as the web getContractorProfile: objective checkable facts and
// attributed register checks, never an IR35 assertion. Contractor-only; a poster
// or an empty profile returns profile:null so the app shows the right state.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json({ profile: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: caller.userId },
    include: {
      limitedCompanies: true,
      documents: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!user) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile: toMobileProfile(user) });
};
