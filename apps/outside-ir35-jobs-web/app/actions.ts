'use server';

import { db as prisma } from '@outside-ir35/db';
import { revalidatePath } from 'next/cache';
import { PostJobFormValues } from '@/types';

export const createJobPost = async ({
  position,
  companyName,
  location,
  dayRate,
  workMode,
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
