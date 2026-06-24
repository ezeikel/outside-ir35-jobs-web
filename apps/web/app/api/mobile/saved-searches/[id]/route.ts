import { AlertFrequency, db as prisma } from '@outside-ir35-jobs/db';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getMobileCaller } from '@/lib/mobile/auth';

// Delete a saved search, or update its alert settings (on/off + frequency).
// Owner-scoped (never by id alone), mirroring the web saved-search actions.
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

// Either field may be sent. At least one is required.
const PatchBody = z
  .object({
    alertsEnabled: z.boolean().optional(),
    alertFrequency: z.nativeEnum(AlertFrequency).optional(),
  })
  .refine(
    (v) => v.alertsEnabled !== undefined || v.alertFrequency !== undefined,
  );

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
      { error: 'alertsEnabled (boolean) and/or alertFrequency required' },
      { status: 400 },
    );
  }
  const data: { alertsEnabled?: boolean; alertFrequency?: AlertFrequency } = {};
  if (parsed.data.alertsEnabled !== undefined) {
    data.alertsEnabled = parsed.data.alertsEnabled;
  }
  if (parsed.data.alertFrequency !== undefined) {
    data.alertFrequency = parsed.data.alertFrequency;
  }
  await prisma.savedSearch.updateMany({
    where: { id, userId: caller.userId },
    data,
  });
  return NextResponse.json({ ok: true });
};
