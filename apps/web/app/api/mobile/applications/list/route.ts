import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileJobCard } from '@/lib/mobile/job-dto';

// The signed-in contractor's applications (jobs they applied to) for the My Jobs >
// Applications tab. Direct prisma scoped to the bearer caller (the auth()-based
// action reads a cookie session mobile lacks — same pattern as saved-jobs). Each
// entry carries the job card + applied date + whether the poster has viewed it.
export const runtime = 'nodejs';

const JOB_CARD_SELECT = {
  id: true,
  position: true,
  companyName: true,
  companyLogo: true,
  location: true,
  dayRate: true,
  workMode: true,
  ir35Signal: true,
  contractLength: true,
  source: true,
  createdAt: true,
} as const;

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rows = await prisma.application.findMany({
    where: { applicantId: caller.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      viewedAt: true,
      job: { select: JOB_CARD_SELECT },
    },
  });

  const applications = rows.map((a) => ({
    id: a.id,
    appliedAt: new Date(a.createdAt).toISOString(),
    viewed: a.viewedAt != null,
    job: toMobileJobCard(a.job),
  }));
  return NextResponse.json({ applications });
};
