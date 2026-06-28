import { NextResponse } from 'next/server';
import { getCVDownloadUrlForCaller } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// A short-lived presigned URL to VIEW one of the caller's own CVs (PDF/image). The
// app opens it in an in-app browser. Owner-scoped inside the action; bearer-auth.
// Private R2 bucket → presigned GET, never a public URL.
export const runtime = 'nodejs';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const url = await getCVDownloadUrlForCaller(caller.userId, id);
  if (!url) {
    return NextResponse.json({ error: 'CV not found' }, { status: 404 });
  }
  return NextResponse.json({ url });
};
