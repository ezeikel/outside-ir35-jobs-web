-- ContractorCV: named, multi-version CVs (vs the one-per-type compliance docs in
-- contractor_documents). One isActive CV per user drives User.parsedProfile/embedding.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the pgvector
-- HNSW indexes and the FTS GIN index (Prisma can't model those), which we
-- deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit applied
-- to every prior migration that touches jobs/users.

-- CreateTable
CREATE TABLE "contractor_cvs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "r2Key" TEXT,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "parsedProfile" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_cvs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contractor_cvs_userId_idx" ON "contractor_cvs"("userId");

-- AddForeignKey
ALTER TABLE "contractor_cvs" ADD CONSTRAINT "contractor_cvs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: move each existing single CV (contractor_documents.type = 'CV') into
-- contractor_cvs as the active CV, carrying its r2Key + status + the user's
-- already-parsed profile (the old single CV is what populated User.parsedProfile).
-- Then drop the old CV rows — CVs now live in their own table. Idempotent: the
-- WHERE NOT EXISTS guard means re-running won't duplicate.
INSERT INTO "contractor_cvs" ("id", "userId", "name", "r2Key", "status", "parsedProfile", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  d."userId",
  'My CV',
  d."r2Key",
  d."status",
  u."parsedProfile",
  true,
  d."createdAt",
  d."updatedAt"
FROM "contractor_documents" d
JOIN "users" u ON u."id" = d."userId"
WHERE d."type" = 'CV'
  AND NOT EXISTS (
    SELECT 1 FROM "contractor_cvs" c WHERE c."userId" = d."userId"
  );

DELETE FROM "contractor_documents" WHERE "type" = 'CV';

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
