import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canApply } from '@/lib/apply/eligibility';
import { getMobileCaller } from '@/lib/mobile/auth';

// Apply to a job from mobile. Uses the SAME canApply eligibility gate as the web
// createApplication action (role, source, active, not own, not already applied),
// so the rule can't drift between surfaces. Caller resolved from the bearer
// token, not a cookie.
export const runtime = 'nodejs';

const APPLICATION_MESSAGE_MAX = 1000;

const Body = z.object({
  jobId: z.string().min(1),
  message: z.string().optional(),
});

const REASON_MESSAGES: Record<string, string> = {
  not_signed_in: 'Please sign in to apply.',
  not_contractor: 'Only contractors can apply.',
  aggregated:
    'This role is from an external source — apply on the original listing.',
  inactive: 'This role is no longer accepting applications.',
  own_job: 'You cannot apply to your own job.',
  already_applied: 'You have already applied to this role.',
};

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 });
  }
  const { jobId, message } = parsed.data;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, source: true, isActive: true, userId: true },
  });
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const already = await prisma.application.findUnique({
    where: { jobId_applicantId: { jobId, applicantId: caller.userId } },
    select: { id: true },
  });

  const verdict = canApply({
    viewerId: caller.userId,
    viewerRole: caller.role,
    jobSource: job.source,
    jobIsActive: job.isActive,
    jobOwnerId: job.userId,
    alreadyApplied: Boolean(already),
  });
  if (!verdict.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[verdict.reason] ?? 'You cannot apply.' },
      { status: 409 },
    );
  }

  const note = message?.trim().slice(0, APPLICATION_MESSAGE_MAX) || null;
  await prisma.application.create({
    data: { jobId, applicantId: caller.userId, message: note },
  });

  return NextResponse.json({ status: 'applied' });
};
