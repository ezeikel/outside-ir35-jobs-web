import { db as prisma } from '@outside-ir35-jobs/db';
import { Role } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { isPremium } from '@/lib/contractor/premium';
import { getMobileCaller } from '@/lib/mobile/auth';
import { toStoredSearch } from '@/lib/search/filters';

// Saved searches for mobile. Mirrors the web saveSearch / getMySavedSearches
// actions: contractor-only, the FREE_SAVED_SEARCH_LIMIT + premium gate, and the
// shared toStoredSearch mapping (so a search saved on mobile is byte-identical
// to one saved on web).
export const runtime = 'nodejs';

const FREE_SAVED_SEARCH_LIMIT = 3;

export const GET = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (caller.role !== Role.JOB_SEEKER) {
    return NextResponse.json({ searches: [] });
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: caller.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      query: true,
      location: true,
      ir35: true,
      mode: true,
      minRate: true,
      alertsEnabled: true,
      alertFrequency: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ searches });
};

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (caller.role !== Role.JOB_SEEKER) {
    return NextResponse.json(
      { error: 'Only contractors can save searches' },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) ?? {};

  const [count, sub] = await Promise.all([
    prisma.savedSearch.count({ where: { userId: caller.userId } }),
    prisma.subscription.findUnique({
      where: { userId: caller.userId },
      select: { status: true, currentPeriodEnd: true },
    }),
  ]);
  if (count >= FREE_SAVED_SEARCH_LIMIT && !isPremium(sub)) {
    return NextResponse.json(
      {
        error: `Free accounts can save up to ${FREE_SAVED_SEARCH_LIMIT} searches. Upgrade to premium for unlimited job alerts.`,
      },
      { status: 402 },
    );
  }

  const search = await prisma.savedSearch.create({
    data: { userId: caller.userId, ...toStoredSearch(body) },
    select: {
      id: true,
      query: true,
      location: true,
      ir35: true,
      mode: true,
      minRate: true,
      alertsEnabled: true,
      alertFrequency: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ search }, { status: 201 });
};
