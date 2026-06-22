-- SavedSearch: a contractor's saved /jobs filter + email alert. A daily cron finds
-- jobs created since lastNotifiedAt that match and emails the contractor. Mirrors
-- SearchParams as discrete columns.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the
-- pgvector HNSW indexes and the FTS GIN index (Prisma can't model those), which
-- we deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit
-- applied to every prior migration that touches jobs/users.

-- CreateTable
CREATE TABLE "saved_searches" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT,
    "location" TEXT,
    "ir35" TEXT,
    "mode" TEXT,
    "minRate" INTEGER,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastNotifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_searches_userId_idx" ON "saved_searches"("userId");

-- AddForeignKey
ALTER TABLE "saved_searches" ADD CONSTRAINT "saved_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
