-- AlterTable: add nullable owner FK. Native posts get a userId from the session;
-- legacy/seed and future AGGREGATED jobs stay null. ON DELETE SET NULL so deleting
-- a poster doesn't delete their jobs.
ALTER TABLE "jobs" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- pgvector wrinkle: `prisma migrate dev` can't represent the HNSW indexes on the
-- Unsupported("vector") columns in schema.prisma, so it emits DROP INDEX for them
-- — which would destroy the semantic-search indexes. Drop those bogus lines and
-- re-create the indexes here (index-neutral). IF NOT EXISTS keeps it idempotent.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
