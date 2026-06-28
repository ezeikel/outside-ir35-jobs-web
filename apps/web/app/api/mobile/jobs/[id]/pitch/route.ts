import { NextResponse } from 'next/server';
import { getJobMatchAndPitchForCaller } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// Per-application AI tailoring: a premium contractor gets a tailored cover note +
// "why this fits" bullets for a specific contract, grounded ONLY in their parsed
// CV (no fabrication, no IR35 claim — see lib/match/generate.ts). Bearer-auth;
// premium-gated inside the shared action. The result statuses drive the mobile UI:
//   no_cv        → "add a CV to draft a pitch"
//   not_premium  → upsell to premium
//   ok           → { whyMatched, pitch }
//   error        → transient; offer retry
export const runtime = 'nodejs';

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (!caller.onboarded) {
    return NextResponse.json({ status: 'no_cv' });
  }

  const { id } = await params;
  // Optional adjustment: rephrase / shorten / formal (re-draft with a tweak).
  const raw = new URL(req.url).searchParams.get('mode');
  const mode =
    raw === 'rephrase' || raw === 'shorten' || raw === 'formal'
      ? raw
      : undefined;
  const result = await getJobMatchAndPitchForCaller(caller.userId, id, mode);
  return NextResponse.json(result);
};
