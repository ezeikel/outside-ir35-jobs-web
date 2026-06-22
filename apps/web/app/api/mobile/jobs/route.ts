import { NextResponse } from 'next/server';
import { searchJobs } from '@/app/actions';
import { toMobileJobCard } from '@/lib/mobile/job-dto';
import type { SearchParams } from '@/lib/search/filters';

// Public board for mobile. Thin wrapper over the searchJobs action (the same
// source of truth the web board uses) → mobile card DTOs. No auth required.
export const runtime = 'nodejs';

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams;

  const params: SearchParams = {
    q: q.get('q') ?? undefined,
    location: q.get('location') ?? undefined,
    ir35: q.get('ir35') ?? undefined,
    mode: q.get('mode') ?? undefined,
    minRate: q.get('minRate') ?? undefined,
    posted: q.get('posted') ?? undefined,
  };

  const rows = await searchJobs(params);
  return NextResponse.json({ jobs: rows.map(toMobileJobCard) });
};
