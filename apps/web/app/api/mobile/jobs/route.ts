import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUnpaidJob, searchJobs } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';
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

// Create a job from mobile. Wraps the SAME createUnpaidJob primitive the web
// createJobPost action uses, so the DB write is identical across both providers.
// Returns the unpaid job's id; the app then completes payment via RevenueCat
// (StoreKit/Play — Stripe is web-only per App Store rules) and the RC webhook
// flips paymentStatus → PAID + isActive=true, reconciling on
// revenueCatTransactionId. The poster is the bearer caller, never the payload.
const Body = z.object({
  companyName: z.string().trim().min(1),
  position: z.string().trim().min(1),
  description: z.string().trim().min(1),
  keywords: z.string(),
  location: z.object({
    address: z.string(),
    placeId: z.string(),
    coordinates: z.object({
      lat: z.number().nullable(),
      lng: z.number().nullable(),
    }),
  }),
  companyLogo: z.string().default(''),
  dayRate: z.union([
    z.array(z.number()).length(1),
    z.tuple([z.number(), z.number()]),
  ]),
  howToApply: z.string().trim().min(1),
  applicationEmail: z.string().trim().email(),
  workMode: z.nativeEnum(WorkMode),
  ir35Signal: z.nativeEnum(JobIR35Signal).default(JobIR35Signal.UNKNOWN),
});

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Dual-capability: any onboarded user may post (role is just a default view).
  if (!caller.onboarded) {
    return NextResponse.json(
      { error: 'Finish setting up your account to post a contract' },
      { status: 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
  }

  const job = await createUnpaidJob(caller.userId, parsed.data);
  // The job is PENDING + isActive=false until the RevenueCat purchase + webhook
  // confirm payment. Return its id so the app can run the StoreKit/Play purchase.
  return NextResponse.json({ jobId: job.id, paymentStatus: job.paymentStatus });
};
