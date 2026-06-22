import { NextResponse } from 'next/server';
import { getJob } from '@/app/actions';
import { toMobileJobDetail } from '@/lib/mobile/job-dto';

// Public job detail for mobile. Wraps getJob, then gates on board visibility so
// the app can never open a hidden listing (e.g. a worker-ingested Inside-IR35
// job kept only for the day-rates benchmark). 404 otherwise.
export const runtime = 'nodejs';

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const job = await getJob(id);

  if (!job || !job.boardVisible || !job.isActive) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ job: toMobileJobDetail(job) });
};
