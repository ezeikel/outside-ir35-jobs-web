-- CreateEnum
CREATE TYPE "AlertFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "saved_searches" ADD COLUMN     "alertFrequency" "AlertFrequency" NOT NULL DEFAULT 'DAILY';

-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "viewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_fcmToken_key" ON "push_subscriptions"("fcmToken");

-- CreateIndex
CREATE INDEX "push_subscriptions_userId_idx" ON "push_subscriptions"("userId");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- NOTE: `prisma migrate diff` also emits spurious `DROP INDEX` lines for the
-- pgvector HNSW / FTS GIN indexes (jobs_embedding_hnsw_idx,
-- jobs_search_vector_gin_idx, users_embedding_hnsw_idx) because Prisma can't
-- model them. They are intentionally OMITTED so this migration never drops them.
