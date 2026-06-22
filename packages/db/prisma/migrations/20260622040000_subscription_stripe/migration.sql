-- Subscription: Stripe linkage for the contractor premium subscription. The Stripe
-- webhook is the source of truth for status/period; isPremium() gates on
-- status=active/trialing AND currentPeriodEnd in the future.
--
-- NOTE: `prisma migrate diff` also emits spurious DROP INDEX lines for the
-- pgvector HNSW indexes and the FTS GIN index (Prisma can't model those), which
-- we deliberately OMIT here and re-assert IF NOT EXISTS — the same hand-edit
-- applied to every prior migration that touches jobs/users.

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'incomplete',
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ALTER COLUMN "type" SET DEFAULT 'PRO';

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- Re-assert the pgvector HNSW + FTS GIN indexes (index-neutral) so they survive.
CREATE INDEX IF NOT EXISTS "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX IF NOT EXISTS "jobs_search_vector_gin_idx" ON "jobs" USING gin ("searchVector");
