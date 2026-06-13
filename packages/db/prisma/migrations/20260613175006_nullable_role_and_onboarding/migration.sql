-- AlterTable: role becomes nullable (chosen at onboarding, not at sign-in) and
-- onboardedAt tracks when the user picked a role. Both are non-destructive:
-- dropping NOT NULL only widens the allowed domain; the new column is nullable.
ALTER TABLE "users" ADD COLUMN     "onboardedAt" TIMESTAMP(3),
ALTER COLUMN "role" DROP NOT NULL;

-- pgvector wrinkle: `prisma migrate dev` introspects the dev DB, can't represent
-- the HNSW indexes on the Unsupported("vector") columns in schema.prisma, and so
-- emits `DROP INDEX` for them — which would silently destroy the semantic-search
-- indexes on every environment this migration touches. We DROP those bogus lines
-- and re-create the indexes here (mirroring the Phase 1 migration), so applying
-- this migration is index-neutral. `IF NOT EXISTS` keeps it idempotent for any
-- branch that still has them.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
