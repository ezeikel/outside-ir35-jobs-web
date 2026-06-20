'use server';

import {
  ContractorDocType,
  DocStatus,
  type JobIR35Signal,
  type JobSource,
  Prisma,
  db as prisma,
  Role,
  type WorkMode,
} from '@outside-ir35-jobs/db';
import { del, getSignedDownloadUrl, put } from '@outside-ir35-jobs/storage';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { computeTrustTier } from '@/lib/contractor/trust-tier';
import {
  computeDocStatus,
  parseCoverLimit,
  parseExpiry,
  tracksExpiry,
  validateUpload,
} from '@/lib/documents/validate';
import { embedAndStoreJob } from '@/lib/search/embed-job';
import { embedQuery } from '@/lib/search/embed-query';
import {
  normalizeFilters,
  OUTSIDE_SIGNALS,
  type SearchParams,
} from '@/lib/search/filters';
import { verifyCompany } from '@/lib/verification/companies-house';
import { verifyVat } from '@/lib/verification/vat';
import {
  AddCompanySchema,
  AddCompanyValues,
  DocumentMetadataSchema,
  OnboardingRoleSchema,
  OnboardingRoleValues,
  PostJobFormValues,
} from '@/types';

// Recompute a contractor's trust tier from their verified companies + documents +
// right-to-work, persisting only when it changes. Internal helper (NOT exported —
// every export in a 'use server' file is a client-callable action). Called after
// any change that can move the tier: upload, metadata edit, expiry sweep.
const recomputeTrustTier = async (userId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      trustTier: true,
      rightToWorkConfirmed: true,
      limitedCompanies: {
        select: { companyVerifiedAt: true, vatVerifiedAt: true },
      },
      documents: { select: { type: true, status: true } },
    },
  });
  if (!user) return false;

  const next = computeTrustTier({
    companies: user.limitedCompanies,
    documents: user.documents,
    rightToWorkConfirmed: user.rightToWorkConfirmed,
  });

  if (next === user.trustTier) return false;

  await prisma.user.update({
    where: { id: userId },
    data: { trustTier: next },
  });
  return true;
};

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

  // Embed it so it appears in semantic search alongside aggregated jobs
  // (best-effort — doesn't block creation if embedding fails).
  await embedAndStoreJob({
    id: job.id,
    position,
    keywords: keywordList,
    description,
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

// A row shaped for jobToCard (the columns the card needs). Raw queries return
// snake/camel exactly as the columns are named in Postgres.
type JobSearchRow = {
  id: string;
  position: string;
  companyName: string;
  companyLogo: string | null;
  location: Prisma.JsonValue;
  dayRate: number[];
  workMode: WorkMode;
  ir35Signal: JobIR35Signal;
  contractLength: number | null;
  source: JobSource;
  sourceUrl: string | null;
  createdAt: Date;
};

const JOB_CARD_COLUMNS = Prisma.sql`
  "id", "position", "companyName", "companyLogo", "location", "dayRate",
  "workMode", "ir35Signal", "contractLength", "source", "sourceUrl", "createdAt"`;

/**
 * Search the board. With a query, ranks by semantic similarity (pgvector cosine,
 * HNSW index) to the query embedding; without one, newest-first. Either way the
 * structured filters (rate floor, work mode, location, IR35-outside, posted) are
 * applied as hard WHERE constraints. All fragments are parameterized — no string
 * interpolation of user input.
 */
export const searchJobs = async (
  params: SearchParams,
): Promise<JobSearchRow[]> => {
  const f = normalizeFilters(params);

  // Hard filters shared by both paths.
  const conds: Prisma.Sql[] = [Prisma.sql`"isActive" = true`];
  if (f.workMode)
    conds.push(Prisma.sql`"workMode" = ${f.workMode}::"WorkMode"`);
  if (f.ir35Outside) {
    conds.push(
      Prisma.sql`"ir35Signal" = ANY(${OUTSIDE_SIGNALS}::"JobIR35Signal"[])`,
    );
  }
  if (f.minRate !== null) {
    // dayRate is Int[] = [min] or [min,max]; the top of the range must clear the floor.
    conds.push(
      Prisma.sql`"dayRate"[array_upper("dayRate", 1)] >= ${f.minRate}`,
    );
  }
  if (f.location) {
    conds.push(Prisma.sql`"location"->>'address' ILIKE ${`%${f.location}%`}`);
  }
  if (f.postedSinceDays !== null) {
    conds.push(
      Prisma.sql`"createdAt" >= now() - make_interval(days => ${f.postedSinceDays})`,
    );
  }

  // Try semantic ranking when a query is present and embeds.
  if (f.q) {
    const vector = await embedQuery(f.q);
    if (vector) {
      const where = Prisma.join(
        [...conds, Prisma.sql`"embedding" IS NOT NULL`],
        ' AND ',
      );
      const vecLiteral = `[${vector.join(',')}]`;
      return prisma.$queryRaw<JobSearchRow[]>`
        SELECT ${JOB_CARD_COLUMNS}
        FROM "jobs"
        WHERE ${where}
        ORDER BY "embedding" <=> ${vecLiteral}::vector
        LIMIT 50`;
    }
    // embed failed → fall through to newest-first + filters (degrade gracefully)
  }

  const where = Prisma.join(conds, ' AND ');
  return prisma.$queryRaw<JobSearchRow[]>`
    SELECT ${JOB_CARD_COLUMNS}
    FROM "jobs"
    WHERE ${where}
    ORDER BY "createdAt" DESC
    LIMIT 50`;
};

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

  const existing = await prisma.contractorDocument.findUnique({
    where: { userId_type: { userId: session.userId, type } },
    select: { r2Key: true, insurer: true, coverLimit: true, expiresAt: true },
  });

  // Replace the old R2 object if the key changed.
  if (existing?.r2Key && existing.r2Key !== key) {
    // Best-effort cleanup — don't fail the upload if the old object is already gone.
    try {
      await del(existing.r2Key);
    } catch {
      // ignore
    }
  }

  // Metadata is only meaningful for expiry-tracking types (insurance, RTW). If the
  // form supplied values use them; otherwise PRESERVE what's already on file (a
  // re-upload of just the file must not wipe insurer/cover/expiry).
  const supplied = tracksExpiry(type)
    ? {
        insurer: (formData.get('insurer') as string | null)?.trim() || null,
        coverLimit: parseCoverLimit(formData.get('coverLimit')),
        expiresAt: parseExpiry(formData.get('expiresAt')),
      }
    : { insurer: null, coverLimit: null, expiresAt: null };

  const insurer = supplied.insurer ?? existing?.insurer ?? null;
  const coverLimit = supplied.coverLimit ?? existing?.coverLimit ?? null;
  const expiresAt = supplied.expiresAt ?? existing?.expiresAt ?? null;
  const status = computeDocStatus(expiresAt, new Date());

  await prisma.contractorDocument.upsert({
    where: { userId_type: { userId: session.userId, type } },
    create: {
      userId: session.userId,
      type,
      r2Key: key,
      status,
      insurer,
      coverLimit,
      expiresAt,
    },
    update: { r2Key: key, status, insurer, coverLimit, expiresAt },
  });

  await recomputeTrustTier(session.userId);
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

// Edit a document's compliance metadata (insurer / cover limit / expiry) without
// re-uploading the file. Recomputes status from the new expiry. The doc's `type`
// is read from the row (not trusted from the client). Accepts raw form strings;
// the zod schema coerces coverLimit→number and expiresAt→Date.
export const setDocumentMetadata = async (
  documentId: string,
  input: {
    insurer?: string;
    coverLimit?: string;
    expiresAt?: string;
  },
) => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    throw new Error('Only contractors can edit documents');
  }

  const doc = await prisma.contractorDocument.findUnique({
    where: { id: documentId },
    select: { userId: true, type: true },
  });
  if (!doc || doc.userId !== session.userId) {
    throw new Error('Document not found');
  }

  // Validate with the doc's real type (insurance ⇒ all three required).
  const { insurer, coverLimit, expiresAt } = DocumentMetadataSchema.parse({
    type: doc.type,
    ...input,
  });

  await prisma.contractorDocument.update({
    where: { id: documentId },
    data: {
      insurer: insurer ?? null,
      coverLimit: coverLimit ?? null,
      expiresAt: expiresAt ?? null,
      status: computeDocStatus(expiresAt ?? null, new Date()),
    },
  });

  await recomputeTrustTier(session.userId);
  revalidatePath('/profile');
};

// Daily expiry sweep: recompute status for every doc that has an expiry, flipping
// ON_FILE → EXPIRING (within the warn window) → FAILED (past expiry). Idempotent —
// only writes rows whose computed status differs from what's stored. Called by the
// cron route (which handles auth); takes no session itself.
export const sweepDocumentExpiry = async () => {
  const now = new Date();
  const docs = await prisma.contractorDocument.findMany({
    where: { expiresAt: { not: null } },
    select: { id: true, userId: true, expiresAt: true, status: true },
  });

  const changed: {
    id: string;
    userId: string;
    from: DocStatus;
    to: DocStatus;
  }[] = [];
  for (const doc of docs) {
    const next = computeDocStatus(doc.expiresAt, now);
    if (next !== doc.status) {
      changed.push({
        id: doc.id,
        userId: doc.userId,
        from: doc.status,
        to: next,
      });
    }
  }

  if (changed.length > 0) {
    await prisma.$transaction(
      changed.map((c) =>
        prisma.contractorDocument.update({
          where: { id: c.id },
          data: { status: c.to },
        }),
      ),
    );
  }

  // Recompute EVERY contractor's tier (cheap at this scale, and guarantees the
  // stored tier always matches reality — self-heals any drift, not only the docs
  // that flipped this run). A doc going EXPIRING/FAILED can demote a tier; a
  // renewal back to ON_FILE restores it.
  const contractors = await prisma.user.findMany({
    where: { role: Role.JOB_SEEKER },
    select: { id: true },
  });
  let tiersUpdated = 0;
  for (const c of contractors) {
    if (await recomputeTrustTier(c.id)) tiersUpdated += 1;
  }

  if (changed.length > 0 || tiersUpdated > 0) {
    revalidatePath('/profile');
  }

  return {
    scanned: docs.length,
    updated: changed.length,
    changed,
    tiersUpdated,
  };
};

export type CompanyVerificationResult = {
  companies_house: 'verified' | 'not_found' | 'inactive' | 'pending' | 'error';
  vat: 'verified' | 'not_found' | 'inactive' | 'pending' | 'error';
};

// Run the official-register checks for a company and stamp the verifiedAt fields
// (only on 'verified'). Persists any address Companies House returns, then
// recomputes the owner's trust tier (so T1 lights up when both checks pass).
// Internal (NOT exported — not a client-callable action). Returns the per-check
// outcome so the UI can show CH ✓ / VAT pending.
const verifyCompanyRecord = async (
  companyId: string,
): Promise<CompanyVerificationResult> => {
  const company = await prisma.limitedCompany.findUnique({
    where: { id: companyId },
    select: { userId: true, incorporationNumber: true, vatNumber: true },
  });
  if (!company) {
    return { companies_house: 'error', vat: 'error' };
  }

  const [ch, vat] = await Promise.all([
    verifyCompany(company.incorporationNumber),
    verifyVat(company.vatNumber),
  ]);

  const now = new Date();
  await prisma.limitedCompany.update({
    where: { id: companyId },
    data: {
      // Only stamp when the register confirms it; clear on any non-verified
      // result so a previously-verified company that lapses loses the badge.
      companyVerifiedAt: ch.status === 'verified' ? now : null,
      vatVerifiedAt: vat.status === 'verified' ? now : null,
      // Use the official registered-office address if we got one.
      ...(ch.address ? { address: ch.address } : {}),
    },
  });

  await recomputeTrustTier(company.userId);

  return { companies_house: ch.status, vat: vat.status };
};

// Add a contractor's limited company and verify it immediately. Owner from the
// session. Returns the per-check verification result for instant UI feedback.
export const addLimitedCompany = async (
  input: AddCompanyValues,
): Promise<CompanyVerificationResult> => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    throw new Error('Only contractors can add a company');
  }

  const { name, incorporationNumber, vatNumber } =
    AddCompanySchema.parse(input);

  const company = await prisma.limitedCompany.create({
    data: { name, incorporationNumber, vatNumber, userId: session.userId },
  });

  const result = await verifyCompanyRecord(company.id);
  revalidatePath('/profile');
  return result;
};

// Re-run verification for one of the caller's own companies (e.g. after the
// contractor fixed a number, or once HMRC creds enable the VAT check).
export const reverifyCompany = async (
  companyId: string,
): Promise<CompanyVerificationResult> => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    throw new Error('Only contractors can verify a company');
  }

  const company = await prisma.limitedCompany.findUnique({
    where: { id: companyId },
    select: { userId: true },
  });
  if (!company || company.userId !== session.userId) {
    throw new Error('Company not found');
  }

  const result = await verifyCompanyRecord(companyId);
  revalidatePath('/profile');
  return result;
};
