import { NextResponse } from 'next/server';
import { getMyApplicantsForCaller } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';
import {
  type CandidateRow,
  toMobileCandidateCard,
} from '@/lib/mobile/candidate-dto';

// The recruiter candidate deck data: the applicants on the caller's own jobs,
// shaped into honesty-safe candidate cards (objective facts only, never a score).
// Bearer-auth (getMobileCaller); ownership-scoped inside the action. Query:
//   ?status=NEW|SHORTLISTED|PASSED|ALL  (default NEW — the untriaged queue)
//   ?jobId=<id>                         (optional: one job's applicants)
export const runtime = 'nodejs';

const isStatus = (v: string | null): v is 'NEW' | 'SHORTLISTED' | 'PASSED' =>
  v === 'NEW' || v === 'SHORTLISTED' || v === 'PASSED';

export const GET = async (req: Request) => {
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

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const status =
    statusParam === 'ALL' ? 'ALL' : isStatus(statusParam) ? statusParam : 'NEW';
  const jobId = url.searchParams.get('jobId') ?? undefined;

  const rows = await getMyApplicantsForCaller(caller.userId, { status, jobId });
  const applicants = rows.map((r) => toMobileCandidateCard(r as CandidateRow));
  return NextResponse.json({ applicants });
};
