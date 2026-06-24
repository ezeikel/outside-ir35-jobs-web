import { Role } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { deleteDocumentForUser } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// Remove one compliance-pack document (by ContractorDocType) for the signed-in
// contractor. Owner-scoped via the shared delete core (R2 object + row + RTW
// retract + trust recompute). Bearer-auth, contractor-only.
export const runtime = 'nodejs';

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (caller.role !== Role.JOB_SEEKER) {
    return NextResponse.json(
      { error: 'Only contractors can remove documents' },
      { status: 403 },
    );
  }

  const { type } = await params;
  const result = await deleteDocumentForUser(caller.userId, type);
  if (!result.deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
};
