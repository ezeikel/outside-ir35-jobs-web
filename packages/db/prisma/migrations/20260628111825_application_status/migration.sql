-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SHORTLISTED', 'PASSED');

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW';

-- pgvector / GIN indexes: Prisma doesn't model these, so `migrate dev` emits a
-- spurious DROP for each every time. We strip those DROPs and re-assert the
-- indexes idempotently so the migration never removes them (see the
-- pgvector-migrate footgun note). No-ops when they already exist.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
