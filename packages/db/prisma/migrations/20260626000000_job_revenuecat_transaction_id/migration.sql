-- AlterTable: RevenueCat transaction id for native MOBILE job-post payments
-- (StoreKit/Play via RevenueCat — Stripe is web-only per App Store rules). The
-- RC webhook reconciles payment → job, mirroring stripeSessionId. DB is the
-- source of truth across both providers.
ALTER TABLE "jobs" ADD COLUMN     "revenueCatTransactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "jobs_revenueCatTransactionId_key" ON "jobs"("revenueCatTransactionId");
