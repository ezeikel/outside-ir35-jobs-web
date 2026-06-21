-- Job.paymentStatus + stripeSessionId: native job postings are paid (£219). A
-- native post is created PENDING + isActive=false; the Stripe webhook flips it to
-- PAID + isActive=true on checkout.session.completed. Defaults to FREE so
-- aggregated/scraped + legacy/seed jobs are unaffected (we never charge for index
-- entries). stripeSessionId is unique so the webhook reconciles payment → job;
-- existing rows are all NULL and Postgres treats NULLs as distinct, so the unique
-- constraint is safe.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the
-- pgvector HNSW indexes and the FTS GIN index (Prisma can't model those), which
-- we deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit
-- applied to every prior migration that touches jobs/users.

-- CreateEnum
CREATE TYPE "JobPaymentStatus" AS ENUM ('FREE', 'PENDING', 'PAID');

-- AlterTable
ALTER TABLE "jobs" ADD COLUMN "paymentStatus" "JobPaymentStatus" NOT NULL DEFAULT 'FREE',
ADD COLUMN "stripeSessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jobs_stripeSessionId_key" ON "jobs"("stripeSessionId");

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
