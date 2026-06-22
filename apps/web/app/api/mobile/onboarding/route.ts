import { db as prisma } from '@outside-ir35-jobs/db';
import { Role } from '@outside-ir35-jobs/db/types';
import { NextResponse } from 'next/server';
import { getMobileCaller } from '@/lib/mobile/auth';
import { OnboardingRoleSchema } from '@/types';

// Pick a role (contractor / hiring) for a freshly-signed-in mobile user. Same
// logic as the setUserRole action: re-validates server-side, stamps onboardedAt,
// clears posterType for contractors. No-ops if already onboarded.
export const runtime = 'nodejs';

export const POST = async (req: Request) => {
  const caller = await getMobileCaller(req);
  if (!caller) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  if (caller.onboarded) {
    return NextResponse.json({
      user: {
        id: caller.userId,
        email: caller.email,
        name: caller.name,
        role: caller.role,
        onboarded: true,
      },
    });
  }

  const parsed = OnboardingRoleSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid role' },
      { status: 400 },
    );
  }
  const { role, posterType } = parsed.data;

  const user = await prisma.user.update({
    where: { id: caller.userId },
    data: {
      role,
      posterType: role === Role.JOB_POSTER ? posterType : null,
      onboardedAt: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      onboardedAt: true,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      onboarded: !!user.onboardedAt,
    },
  });
};
