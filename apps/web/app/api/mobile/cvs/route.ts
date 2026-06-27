import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { uploadCVForUser } from '@/app/actions';
import { UploadError } from '@/lib/documents/validate';
import { getMobileCaller } from '@/lib/mobile/auth';

// CVs for mobile (named, multi-version). GET lists the caller's CVs; POST uploads
// a new one (multipart: name + file), which becomes the active CV and kicks off
// parsing. Wraps the session-agnostic uploadCVForUser core so the rules (R2 put,
// active-flag transaction, parse trigger, trust recompute) can't drift from web.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const cvs = await prisma.contractorCV.findMany({
    where: { userId: caller.userId },
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      name: true,
      status: true,
      isActive: true,
      parsedProfile: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    cvs: cvs.map((cv) => ({
      id: cv.id,
      name: cv.name,
      status: cv.status,
      isActive: cv.isActive,
      parsed: cv.parsedProfile != null,
      createdAt: cv.createdAt.toISOString(),
    })),
  });
};

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account to add a CV' },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  try {
    const cv = await uploadCVForUser(caller.userId, formData);
    return NextResponse.json({ cv }, { status: 201 });
  } catch (e) {
    // A bad file (mime/size/limit) is a 400; anything else is a real 500.
    if (e instanceof UploadError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
};
