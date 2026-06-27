import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { getMobileCaller } from '@/lib/mobile/auth';

// Unsave a job. Owner-scoped + idempotent: deleteMany so removing a job that
// isn't saved is a no-op, never a 404/500.
export const runtime = 'nodejs';

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { jobId } = await params;
  await prisma.savedJob.deleteMany({
    where: { userId: caller.userId, jobId },
  });
  return NextResponse.json({ ok: true });
};
