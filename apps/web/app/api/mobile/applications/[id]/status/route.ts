import { NextResponse } from 'next/server';
import { z } from 'zod';
import { setApplicationStatusForCaller } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// Set the triage status on one application (the recruiter swipe deck): SHORTLISTED
// (right swipe) or PASSED (left), or NEW to un-triage. Ownership-checked inside the
// action — a poster can only set status on applications to jobs they own. Bearer-auth.
export const runtime = 'nodejs';

const Body = z.object({
  status: z.enum(['NEW', 'SHORTLISTED', 'PASSED']),
});

export const POST = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account first' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const ok = await setApplicationStatusForCaller(
    caller.userId,
    id,
    parsed.data.status,
  );
  if (!ok) {
    // Not found OR not the caller's job — same response either way (don't leak
    // which applications exist).
    return NextResponse.json(
      { error: 'Application not found' },
      { status: 404 },
    );
  }
  return NextResponse.json({ status: parsed.data.status });
};
