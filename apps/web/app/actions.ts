'use server';

import { db as prisma, Role } from '@outside-ir35-jobs/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import {
  OnboardingRoleSchema,
  OnboardingRoleValues,
  PostJobFormValues,
} from '@/types';

export const createJobPost = async ({
  position,
  companyName,
  location,
  dayRate,
  workMode,
  ir35Signal,
  description,
  howToApply,
  applicationEmail,
}: PostJobFormValues) => {
  const job = await prisma.job.create({
    data: {
      position,
      companyName,
      location,
      dayRate,
      workMode,
      // The client's stated IR35 position (poster-attested). Defaults to UNKNOWN
      // when unset — we never persist an assertion of status.
      ir35Signal: ir35Signal ?? 'UNKNOWN',
      description,
      howToApply,
      applicationEmail,
    },
  });

  revalidatePath('/jobs');

  return job;
};

export const getJobs = async () => prisma.job.findMany();

export const getJob = async (id: string) =>
  prisma.job.findUnique({
    where: { id },
  });

// Persist the role the user picked at onboarding. Contractor → JOB_SEEKER,
// hiring → JOB_POSTER (+ posterType). Stamps onboardedAt so the onboarding gate
// passes thereafter. No-ops if already onboarded.
export const setUserRole = async (input: OnboardingRoleValues) => {
  const session = await auth();
  if (!session?.userId) {
    throw new Error('Not authenticated');
  }
  if (session.onboarded) {
    return;
  }

  // Re-validate server-side — never trust the client payload.
  const { role, posterType } = OnboardingRoleSchema.parse(input);

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      role,
      // posterType only applies to hiring accounts; clear it otherwise so a
      // contractor can never carry a stale recruiter/direct flag.
      posterType: role === Role.JOB_POSTER ? posterType : null,
      onboardedAt: new Date(),
    },
  });

  revalidatePath('/profile');
};

// The verified contractor profile (the moat) — scoped to the signed-in user.
// Returns null when not signed in or not a contractor, so the page can show the
// appropriate empty state. (Previously this fell back to "the first JOB_SEEKER",
// leaking a stranger's compliance pack to any visitor — removed.)
export const getContractorProfile = async () => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      limitedCompanies: true,
      documents: { orderBy: { createdAt: 'asc' } },
    },
  });
};
