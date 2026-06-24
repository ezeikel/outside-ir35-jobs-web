-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('STRIPE', 'REVENUECAT');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "provider" "SubscriptionProvider" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "revenueCatProductId" TEXT,
ADD COLUMN     "revenueCatUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_revenueCatUserId_key" ON "subscriptions"("revenueCatUserId");

-- NOTE: `prisma migrate diff` also emits spurious `DROP INDEX` lines for the
-- pgvector HNSW / FTS GIN indexes (jobs_embedding_hnsw_idx,
-- jobs_search_vector_gin_idx, users_embedding_hnsw_idx) because Prisma can't
-- model them. They are intentionally OMITTED here so this migration never drops
-- them. See the project's pgvector-migrate footgun notes.
