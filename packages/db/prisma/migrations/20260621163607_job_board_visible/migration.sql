-- Job.boardVisible: whether a job may appear on a PUBLIC board surface (default
-- /jobs, homepage, recommendations). Distinct from isActive (= live/not expired).
-- The worker sets this false for ir35Signal=INSIDE so Inside-IR35 listings stay in
-- the DB (the /day-rates inside-vs-outside benchmark needs them) but never reach a
-- board. Defense-in-depth alongside the web-side ir35Signal<>INSIDE gate.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the
-- pgvector HNSW indexes and the FTS GIN index (Prisma can't model those), which
-- we deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit
-- applied to every prior migration that touches jobs/users.

ALTER TABLE "jobs" ADD COLUMN "boardVisible" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: existing Inside-IR35 listings were ingested before this column, so
-- flip them not-board-visible (they stay in the DB for the day-rates benchmark).
-- Idempotent — re-running is a no-op.
UPDATE "jobs" SET "boardVisible" = false WHERE "ir35Signal" = 'INSIDE';

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
