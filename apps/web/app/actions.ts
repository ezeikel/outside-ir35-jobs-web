'use server';

import { db as prisma } from '@outside-ir35-jobs/db';
import { revalidatePath } from 'next/cache';
import { PostJobFormValues } from '@/types';

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

// The verified contractor profile (the moat). Until auth is wired into a real
// session, the /profile route shows the current viewer's profile — for now we
// resolve the first JOB_SEEKER. Returns the contractor with their company +
// compliance-pack documents.
export const getContractorProfile = async (userId?: string) =>
  prisma.user.findFirst({
    where: userId ? { id: userId } : { role: 'JOB_SEEKER' },
    include: {
      limitedCompanies: true,
      documents: { orderBy: { createdAt: 'asc' } },
    },
  });
