'use server';

import {
  ContractorDocType,
  DocStatus,
  db as prisma,
  Role,
} from '@outside-ir35-jobs/db';
import { del, getSignedDownloadUrl, put } from '@outside-ir35-jobs/storage';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { validateUpload } from '@/lib/documents/validate';
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
  keywords,
  companyLogo,
  howToApply,
  applicationEmail,
}: PostJobFormValues) => {
  // Only signed-in posters may create jobs; the owner comes from the session,
  // never the client payload.
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_POSTER) {
    throw new Error('Only job posters can create jobs');
  }

  // keywords arrive as a free-text string (e.g. "React, Node.js"); the column is
  // String[]. Split on commas, trim, drop blanks.
  const keywordList = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);

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
      keywords: keywordList,
      // Optional column — only set when the poster supplied a logo URL.
      ...(companyLogo ? { companyLogo } : {}),
      howToApply,
      applicationEmail,
      // Attribute the job to its poster.
      userId: session.userId,
    },
  });

  revalidatePath('/jobs');
  // Homepage shows the latest contracts too.
  revalidatePath('/');

  return job;
};

export const getJobs = async () =>
  prisma.job.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

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

// Upload a compliance-pack document to R2 and record it. One row per (user, type)
// — re-uploading a type replaces the file. status=ON_FILE is an objective "we hold
// this file" fact, never an IR35 assertion. Owner comes from the session.
export const uploadContractorDocument = async (formData: FormData) => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    throw new Error('Only contractors can upload documents');
  }

  const rawType = String(formData.get('type') ?? '');
  const file = formData.get('file');
  if (!(file instanceof File)) {
    throw new Error('No file provided');
  }

  const check = validateUpload({
    type: rawType,
    mimeType: file.type,
    size: file.size,
  });
  if (!check.ok) {
    throw new Error(check.error);
  }
  const type: ContractorDocType = check.type;

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  // User-scoped, random key — no leading slash (the package prepends the bucket).
  // The UUID keeps the key unguessable even though the bucket is private.
  const key = `contractors/${session.userId}/${type.toLowerCase()}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await put(key, buffer, { contentType: file.type });

  // Replace any existing doc of this type; delete its old R2 object first.
  const existing = await prisma.contractorDocument.findUnique({
    where: { userId_type: { userId: session.userId, type } },
    select: { r2Key: true },
  });
  if (existing?.r2Key && existing.r2Key !== key) {
    // Best-effort cleanup — don't fail the upload if the old object is already gone.
    try {
      await del(existing.r2Key);
    } catch {
      // ignore
    }
  }

  await prisma.contractorDocument.upsert({
    where: { userId_type: { userId: session.userId, type } },
    create: {
      userId: session.userId,
      type,
      r2Key: key,
      status: DocStatus.ON_FILE,
    },
    update: {
      r2Key: key,
      status: DocStatus.ON_FILE,
      // A fresh upload resets type-specific metadata until re-entered.
      insurer: null,
      coverLimit: null,
      expiresAt: null,
    },
  });

  revalidatePath('/profile');
};

// Return a short-lived presigned URL to view/download one of the caller's own
// documents. Private bucket → never a public R2_PUBLIC_URL concat.
export const getDocumentDownloadUrl = async (
  documentId: string,
): Promise<string> => {
  const session = await auth();
  if (!session?.userId) {
    throw new Error('Not authenticated');
  }

  const doc = await prisma.contractorDocument.findUnique({
    where: { id: documentId },
    select: { userId: true, r2Key: true },
  });
  if (!doc || doc.userId !== session.userId || !doc.r2Key) {
    throw new Error('Document not found');
  }

  return getSignedDownloadUrl(doc.r2Key, 300);
};
