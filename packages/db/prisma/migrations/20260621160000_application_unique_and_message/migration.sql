-- Application: optional cover message + one-application-per-(job, applicant) so a
-- contractor can't double-apply.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the
-- pgvector HNSW indexes and the FTS GIN index (Prisma can't model those), which
-- we deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit
-- applied to every prior migration that touches jobs/users.

ALTER TABLE "applications" ADD COLUMN "message" TEXT;

CREATE UNIQUE INDEX "applications_jobId_applicantId_key"
  ON "applications" ("jobId", "applicantId");

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
