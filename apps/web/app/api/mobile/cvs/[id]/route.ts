import { db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteCVForUser, setActiveCVForUser } from '@/app/actions';
import { getMobileCaller } from '@/lib/mobile/auth';

// One CV (mobile). PATCH renames it and/or makes it the active CV (the one that
// drives job matching). DELETE removes it (and promotes another to active, or
// clears the matching profile if it was the last). Owner-scoped throughout.
export const runtime = 'nodejs';

const Patch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isActive: z.literal(true).optional(),
});

export const PATCH = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (parsed.data.name !== undefined) {
    // Owner-scoped rename.
    await prisma.contractorCV.updateMany({
      where: { id, userId: caller.userId },
      data: { name: parsed.data.name },
    });
  }

  if (parsed.data.isActive) {
    try {
      await setActiveCVForUser(caller.userId, id);
    } catch {
      return NextResponse.json({ error: 'CV not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ ok: true });
};

export const DELETE = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  await deleteCVForUser(caller.userId, id);
  return NextResponse.json({ ok: true });
};
