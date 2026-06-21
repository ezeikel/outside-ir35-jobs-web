'use server';

import {
  ContractorDocType,
  type ContractorTrustTier,
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
import { canApply } from '@/lib/apply/eligibility';
import { MIN_SAMPLE } from '@/lib/benchmarks/compute';
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
import { reciprocalRankFusion } from '@/lib/search/rrf';
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
    // Outside-IR35 board: the homepage latest-jobs never shows explicit INSIDE
    // listings (they stay in the DB for the day-rates benchmark only).
    where: { isActive: true, ir35Signal: { not: 'INSIDE' } },
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
 * Search the board. With a query, ranks by HYBRID relevance: lexical full-text
 * (Postgres FTS, GIN index) fused with semantic similarity (pgvector cosine, HNSW
 * index) via Reciprocal Rank Fusion — so exact-keyword and conceptual matches both
 * surface, and jobs strong on both rank top. FTS works without an embedding, so
 * search degrades gracefully (FTS-only, semantic-only, or newest-first). Either
 * way the structured filters (rate floor, work mode, location, IR35-outside,
 * posted) apply as hard WHERE constraints. All fragments are parameterized.
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
    // Strict: only outside-leaning signals.
    conds.push(
      Prisma.sql`"ir35Signal" = ANY(${OUTSIDE_SIGNALS}::"JobIR35Signal"[])`,
    );
  } else if (f.ir35ExcludeInside) {
    // Default board: everything except explicit INSIDE (this is an outside-IR35
    // board; an Inside-IR35 role doesn't belong on the unfiltered listing).
    conds.push(Prisma.sql`"ir35Signal" <> 'INSIDE'::"JobIR35Signal"`);
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

  const where = Prisma.join(conds, ' AND ');

  // Hybrid ranking when a query is present: fuse lexical (FTS) + semantic
  // (pgvector) rankings with RRF. FTS needs no embedding so it's always
  // available; semantic adds conceptual matches. Either alone still ranks; if
  // both are empty we fall through to newest-first.
  if (f.q) {
    const RANK_LIMIT = 100; // gather more per ranker than we return, for a fuller fusion

    // Lexical ranking via the FTS searchVector + GIN index.
    const ftsPromise = prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "jobs"
      WHERE ${where}
        AND "searchVector" @@ websearch_to_tsquery('english', ${f.q})
      ORDER BY ts_rank("searchVector", websearch_to_tsquery('english', ${f.q})) DESC
      LIMIT ${RANK_LIMIT}`;

    // Semantic ranking via pgvector cosine (only if the query embeds).
    const vector = await embedQuery(f.q);
    const semanticPromise = vector
      ? prisma.$queryRaw<{ id: string }[]>`
          SELECT "id"
          FROM "jobs"
          WHERE ${Prisma.join([...conds, Prisma.sql`"embedding" IS NOT NULL`], ' AND ')}
          ORDER BY "embedding" <=> ${`[${vector.join(',')}]`}::vector
          LIMIT ${RANK_LIMIT}`
      : Promise.resolve<{ id: string }[]>([]);

    const [ftsRows, semanticRows] = await Promise.all([
      ftsPromise.catch(() => [] as { id: string }[]),
      semanticPromise.catch(() => [] as { id: string }[]),
    ]);

    const rankings = [
      ftsRows.map((r) => r.id),
      semanticRows.map((r) => r.id),
    ].filter((list) => list.length > 0);

    if (rankings.length > 0) {
      const fusedIds = reciprocalRankFusion(rankings).slice(0, 50);
      // Fetch the cards for the fused ids, preserving the fused order.
      const rows = await prisma.$queryRaw<JobSearchRow[]>`
        SELECT ${JOB_CARD_COLUMNS}
        FROM "jobs"
        WHERE "id" = ANY(${fusedIds})`;
      const byId = new Map(rows.map((r) => [r.id, r]));
      return fusedIds
        .map((id) => byId.get(id))
        .filter((r): r is JobSearchRow => Boolean(r));
    }
    // No ranker produced hits → fall through to newest-first.
  }

  return prisma.$queryRaw<JobSearchRow[]>`
    SELECT ${JOB_CARD_COLUMNS}
    FROM "jobs"
    WHERE ${where}
    ORDER BY "createdAt" DESC
    LIMIT 50`;
};

// A recommended job is a search card plus its match distance (cosine, lower =
// closer). The UI never shows the raw number; it's there for ordering + the cap.
export type RecommendedJob = JobSearchRow & { distance: number };

export type RecommendationResult =
  | { status: 'no_cv' } // contractor has no parsed-CV embedding yet
  | { status: 'ok'; jobs: RecommendedJob[] };

// Only surface jobs within this cosine distance of the contractor's profile.
// Beyond it the match is too weak to honestly call a "recommendation" — better to
// show fewer (or none) than pad the list with noise. Distance = 1 - similarity.
const RECOMMEND_MAX_DISTANCE = 0.62;
const RECOMMEND_LIMIT = 8;

/**
 * Recommend jobs for the signed-in contractor by semantic similarity between
 * their parsed-CV embedding (User.embedding) and each active job's embedding
 * (pgvector cosine, HNSW index). Honest by design: no CV embedding → 'no_cv' (the
 * UI prompts to upload a CV); weak matches beyond RECOMMEND_MAX_DISTANCE are
 * dropped rather than shown as tailored; near-duplicate listings are de-duped.
 */
export const getRecommendedJobs = async (): Promise<RecommendationResult> => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) {
    return { status: 'no_cv' };
  }

  // The embedding column is Unsupported() in Prisma → read it as text via raw SQL.
  const rows = await prisma.$queryRaw<{ embedding: string | null }[]>`
    SELECT "embedding"::text AS embedding FROM "users" WHERE "id" = ${session.userId}`;
  const vecText = rows[0]?.embedding;
  if (!vecText) return { status: 'no_cv' };

  // Pull a few extra to allow for de-duplication, then trim to the limit.
  const candidates = await prisma.$queryRaw<RecommendedJob[]>`
    SELECT ${JOB_CARD_COLUMNS},
      ("embedding" <=> ${vecText}::vector) AS distance
    FROM "jobs"
    WHERE "isActive" = true
      AND "ir35Signal" <> 'INSIDE'::"JobIR35Signal"
      AND "embedding" IS NOT NULL
      AND ("embedding" <=> ${vecText}::vector) <= ${RECOMMEND_MAX_DISTANCE}
    ORDER BY "embedding" <=> ${vecText}::vector
    LIMIT ${RECOMMEND_LIMIT * 3}`;

  // De-dupe near-identical listings (same title + company), keeping the closest.
  const seen = new Set<string>();
  const jobs: RecommendedJob[] = [];
  for (const job of candidates) {
    const key = `${job.position.toLowerCase().trim()}|${job.companyName.toLowerCase().trim()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    jobs.push(job);
    if (jobs.length >= RECOMMEND_LIMIT) break;
  }

  return { status: 'ok', jobs };
};

export type DayRateBenchmark = {
  skill: string;
  ir35Bucket: 'OUTSIDE' | 'INSIDE' | 'UNKNOWN';
  sampleSize: number;
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
};

/**
 * Day-rate benchmarks per skill × IR35 bucket, computed over active jobs that
 * have a day rate. Each job's representative rate is the midpoint of its
 * dayRate[min,max] (mirrors jobMidpoint, so the median is verifiable). HARD-GATED:
 * a (skill, bucket) is only returned with >= MIN_SAMPLE distinct jobs — we never
 * publish a benchmark off thin data (honesty, per docs/ir35-trust-model.md).
 */
export const getDayRateBenchmarks = async (): Promise<DayRateBenchmark[]> => {
  return prisma.$queryRaw<DayRateBenchmark[]>`
    WITH job_rates AS (
      SELECT
        j.id,
        lower(trim(skill)) AS skill,
        CASE
          WHEN j."ir35Signal" = ANY(${OUTSIDE_SIGNALS}::"JobIR35Signal"[]) THEN 'OUTSIDE'
          WHEN j."ir35Signal" = 'INSIDE'::"JobIR35Signal" THEN 'INSIDE'
          ELSE 'UNKNOWN'
        END AS ir35_bucket,
        -- midpoint of dayRate[min,max] (or the single value)
        CASE
          WHEN array_length(j."dayRate", 1) >= 2
            THEN round((j."dayRate"[1] + j."dayRate"[array_upper(j."dayRate",1)]) / 2.0)
          ELSE j."dayRate"[1]
        END AS rate
      FROM "jobs" j
      CROSS JOIN LATERAL unnest(j."extractedSkills") AS skill
      WHERE j."isActive" = true
        AND array_length(j."dayRate", 1) >= 1
        AND trim(skill) <> ''
    )
    SELECT
      skill,
      ir35_bucket AS "ir35Bucket",
      count(DISTINCT id)::int AS "sampleSize",
      round(percentile_cont(0.5) WITHIN GROUP (ORDER BY rate))::int AS median,
      round(percentile_cont(0.25) WITHIN GROUP (ORDER BY rate))::int AS p25,
      round(percentile_cont(0.75) WITHIN GROUP (ORDER BY rate))::int AS p75,
      min(rate)::int AS min,
      max(rate)::int AS max
    FROM job_rates
    GROUP BY skill, ir35_bucket
    HAVING count(DISTINCT id) >= ${MIN_SAMPLE}
    ORDER BY count(DISTINCT id) DESC, median DESC`;
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

  // A CV upload kicks off background parsing on the worker (fetch from R2 →
  // Claude → structured profile + embedding). Fire-and-forget: best-effort, never
  // blocks or fails the upload. The profile shows on the next /profile load.
  if (type === ContractorDocType.CV) {
    triggerCvParse({ userId: session.userId, r2Key: key, mimeType: file.type });
  }

  await recomputeTrustTier(session.userId);
  revalidatePath('/profile');
};

// Fire-and-forget POST to the worker's CV-parse endpoint. Bearer-gated with the
// shared WORKER_SECRET. We don't await the work — only the 202 ack — and swallow
// failures so a parse outage never affects the upload.
const triggerCvParse = (body: {
  userId: string;
  r2Key: string;
  mimeType: string;
}): void => {
  const workerUrl = process.env.OUTSIDE_IR35_JOBS_WORKER_URL;
  if (!workerUrl) return;
  void fetch(`${workerUrl}/process/cv`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.WORKER_SECRET ?? ''}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  }).catch((err) => {
    console.error('[triggerCvParse] failed to reach worker:', err);
  });
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

// ---- Job applications -------------------------------------------------------

const APPLICATION_MESSAGE_MAX = 1000;

/**
 * Apply to a NATIVE job with the signed-in contractor's verified profile, plus an
 * optional short cover message. Gated by canApply (role, source, active, not own
 * job, not already applied) — the DB unique([jobId, applicantId]) is the final
 * backstop against double-apply.
 */
export const createApplication = async (
  jobId: string,
  message?: string,
): Promise<{ status: 'applied' }> => {
  const session = await auth();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, source: true, isActive: true, userId: true },
  });
  if (!job) throw new Error('Job not found');

  const already = session?.userId
    ? await prisma.application.findUnique({
        where: { jobId_applicantId: { jobId, applicantId: session.userId } },
        select: { id: true },
      })
    : null;

  const verdict = canApply({
    viewerId: session?.userId ?? null,
    viewerRole: session?.role ?? null,
    jobSource: job.source,
    jobIsActive: job.isActive,
    jobOwnerId: job.userId,
    alreadyApplied: Boolean(already),
  });
  if (!verdict.ok) {
    const messages: Record<string, string> = {
      not_signed_in: 'Please sign in to apply.',
      not_contractor: 'Only contractors can apply.',
      aggregated:
        'This role is from an external source — apply on the original listing.',
      inactive: 'This role is no longer accepting applications.',
      own_job: 'You cannot apply to your own job.',
      already_applied: 'You have already applied to this role.',
    };
    throw new Error(
      messages[verdict.reason] ?? 'You cannot apply to this role.',
    );
  }

  const note = message?.trim().slice(0, APPLICATION_MESSAGE_MAX) || null;

  await prisma.application.create({
    data: { jobId, applicantId: session!.userId as string, message: note },
  });

  revalidatePath(`/job/${jobId}`);
  revalidatePath('/dashboard');
  return { status: 'applied' };
};

// The applicant rows a poster sees on their dashboard (identity + trust, not the
// raw documents). The applicant's full verified pack is fetched on demand via
// getApplicantProfile (a separate, ownership-checked read).
export type DashboardApplicant = {
  applicationId: string;
  applicantId: string;
  name: string;
  trustTier: ContractorTrustTier;
  message: string | null;
  appliedAt: Date;
};

export type DashboardJob = {
  id: string;
  position: string;
  isActive: boolean;
  createdAt: Date;
  applicants: DashboardApplicant[];
};

/**
 * The jobs the signed-in poster owns, each with its applicants. JOB_POSTER only,
 * session-scoped to jobs they posted.
 */
export const getMyJobsWithApplicants = async (): Promise<DashboardJob[]> => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_POSTER) {
    return [];
  }

  const jobs = await prisma.job.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      position: true,
      isActive: true,
      createdAt: true,
      applications: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          message: true,
          createdAt: true,
          applicant: { select: { id: true, name: true, trustTier: true } },
        },
      },
    },
  });

  return jobs.map((j) => ({
    id: j.id,
    position: j.position,
    isActive: j.isActive,
    createdAt: j.createdAt,
    applicants: j.applications.map((a) => ({
      applicationId: a.id,
      applicantId: a.applicant.id,
      name: a.applicant.name,
      trustTier: a.applicant.trustTier,
      message: a.message,
      appliedAt: a.createdAt,
    })),
  }));
};

/**
 * A poster views one applicant's verified profile — ONLY when that applicant has
 * applied to a job the poster owns. The ownership check is the access gate: no
 * poster can read a contractor who didn't apply to their job.
 */
export const getApplicantProfile = async (applicantId: string) => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_POSTER) {
    return null;
  }

  // The applicant must have an application on a job this poster owns.
  const link = await prisma.application.findFirst({
    where: { applicantId, job: { userId: session.userId } },
    select: { id: true },
  });
  if (!link) return null;

  return prisma.user.findUnique({
    where: { id: applicantId },
    include: {
      limitedCompanies: true,
      documents: { orderBy: { createdAt: 'asc' } },
    },
  });
};

/**
 * The jobs the signed-in contractor has applied to (for "already applied" state
 * and a future "my applications" view). JOB_SEEKER only.
 */
export const getMyApplications = async (): Promise<string[]> => {
  const session = await auth();
  if (!session?.userId || session.role !== Role.JOB_SEEKER) return [];
  const apps = await prisma.application.findMany({
    where: { applicantId: session.userId },
    select: { jobId: true },
  });
  return apps.map((a) => a.jobId);
};
