import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileCaller } from '@/lib/mobile/auth';

// Delete or toggle alerts on one saved search. Owner-scoped (never by id alone),
// mirroring the web deleteSavedSearch / setSavedSearchAlerts actions.
export const runtime = 'nodejs';

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  await prisma.savedSearch.deleteMany({
    where: { id, userId: caller.userId },
  });
  return NextResponse.json({ ok: true });
};

const PatchBody = z.object({ alertsEnabled: z.boolean() });

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'alertsEnabled (boolean) required' },
      { status: 400 },
    );
  }
  await prisma.savedSearch.updateMany({
    where: { id, userId: caller.userId },
    data: { alertsEnabled: parsed.data.alertsEnabled },
  });
  return NextResponse.json({ ok: true });
};
