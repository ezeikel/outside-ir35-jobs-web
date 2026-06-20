-- Full-text (lexical) search for jobs. A tsvector column over the searchable
-- text, weighted: position + extracted skills most important (A), company (B),
-- description (C), keywords (D). Maintained by a TRIGGER on insert/update — not a
-- GENERATED column, because `to_tsvector('english', ...)` is STABLE (not
-- IMMUTABLE) so Postgres rejects it in a generation expression. A GIN index makes
-- @@ matching fast. Fused with the pgvector `embedding` ranking via Reciprocal
-- Rank Fusion in the searchJobs action. Statements are idempotent (IF NOT EXISTS /
-- OR REPLACE) so a re-run after a partial apply is safe.
--
-- NOTE: `prisma migrate diff` emits spurious `DROP INDEX jobs_embedding_hnsw_idx`
-- / `users_embedding_hnsw_idx` lines (Prisma can't see the pgvector HNSW indexes),
-- which we deliberately OMIT here so the semantic-search indexes survive — the
-- same hand-edit applied to every prior migration that touches the jobs table.

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "searchVector" tsvector;

-- The weighted tsvector builder, shared by the trigger and the backfill. Params
-- are prefixed (p_) to avoid the reserved word "position".
CREATE OR REPLACE FUNCTION jobs_search_vector(
  p_position text, p_skills text[], p_company text, p_descr text, p_keywords text[]
) RETURNS tsvector
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    setweight(to_tsvector('english', coalesce(p_position, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(p_skills, '{}'), ' ')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_company, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(p_descr, '')), 'C') ||
    setweight(to_tsvector('english', array_to_string(coalesce(p_keywords, '{}'), ' ')), 'D')
$$;

CREATE OR REPLACE FUNCTION jobs_search_vector_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW."searchVector" := jobs_search_vector(
    NEW."position", NEW."extractedSkills", NEW."companyName",
    NEW."description", NEW."keywords"
  );
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS jobs_search_vector_update ON "jobs";
CREATE TRIGGER jobs_search_vector_update
  BEFORE INSERT OR UPDATE OF "position", "extractedSkills", "companyName", "description", "keywords"
  ON "jobs"
  FOR EACH ROW EXECUTE FUNCTION jobs_search_vector_trigger();

-- Backfill existing rows.
UPDATE "jobs" SET "searchVector" = jobs_search_vector(
  "position", "extractedSkills", "companyName", "description", "keywords"
);

CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");

-- Re-assert the pgvector HNSW indexes (index-neutral) so a future `migrate diff`
-- baseline stays consistent and the semantic indexes are never lost.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
