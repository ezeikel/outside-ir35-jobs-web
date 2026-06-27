import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileJobCard } from '@/lib/mobile/job-dto';

// Saved jobs ("save for later") for mobile. Goes straight to prisma scoped to the
// bearer caller (the auth()-based web actions read a cookie session mobile doesn't
// have — same pattern as the saved-searches route). Any onboarded caller may save;
// role is just a default view now (dual-capability). The board hydrates heart
// state from GET; the My Jobs > Saved tab renders the embedded job cards.
export const runtime = 'nodejs';

// The columns toMobileJobCard needs — kept identical to the board's card select.
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

  const rows = await prisma.savedJob.findMany({
    where: { userId: caller.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      job: { select: JOB_CARD_SELECT },
    },
  });

  const saved = rows.map((r) => ({
    id: r.id,
    savedAt: new Date(r.createdAt).toISOString(),
    job: toMobileJobCard(r.job),
  }));
  return NextResponse.json({ saved });
};

const Body = z.object({ jobId: z.string().min(1) });

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account to save jobs' },
      { status: 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Idempotent: the (userId, jobId) unique constraint makes a repeat save a no-op.
  await prisma.savedJob.upsert({
    where: {
      userId_jobId: { userId: caller.userId, jobId: parsed.data.jobId },
    },
    create: { userId: caller.userId, jobId: parsed.data.jobId },
    update: {},
  });
  return NextResponse.json({ saved: true }, { status: 201 });
};
