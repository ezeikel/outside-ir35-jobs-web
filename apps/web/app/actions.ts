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
