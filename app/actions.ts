/* eslint-disable import/prefer-default-export */

'use server';

import prisma from '@/lib/prisma';
import { PostJobFormValues } from '@/types';
import { revalidatePath } from 'next/cache';

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

export const getJobs = async () => {
  return prisma.job.findMany();
};

export const getJob = async (id: string) => {
  return prisma.job.findUnique({
    where: { id },
  });
};
