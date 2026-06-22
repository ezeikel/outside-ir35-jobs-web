import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getJob } from '@/app/actions';
import { canApply } from '@/lib/apply/eligibility';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toMobileJobDetail } from '@/lib/mobile/job-dto';

// Public job detail for mobile. Wraps getJob, then gates on board visibility so
// the app can never open a hidden listing (e.g. a worker-ingested Inside-IR35
// job kept only for the day-rates benchmark). 404 otherwise.
//
// If a bearer token is present, also computes the caller's apply eligibility
// (the SAME canApply gate the web uses) so the app can render the right apply
// state — apply / already-applied / sign-in / link-out — without a second call.
export const runtime = 'nodejs';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const job = await getJob(id);

  if (!job || !job.boardVisible || !job.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const caller = await getMobileCaller(req);
  let apply: { canApply: boolean; reason?: string; alreadyApplied: boolean } = {
    canApply: false,
    reason: 'not_signed_in',
    alreadyApplied: false,
  };

  if (caller) {
    const already = await prisma.application.findUnique({
      where: { jobId_applicantId: { jobId: id, applicantId: caller.userId } },
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
    apply = {
      canApply: verdict.ok,
      reason: verdict.ok ? undefined : verdict.reason,
      alreadyApplied: Boolean(already),
    };
  }

  return NextResponse.json({ job: toMobileJobDetail(job), apply });
};
