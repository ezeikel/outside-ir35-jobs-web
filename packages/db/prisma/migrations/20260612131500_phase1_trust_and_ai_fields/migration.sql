-- pgvector: required before any vector(N) column. Already enabled on both Neon
-- branches in Phase 0; IF NOT EXISTS keeps this migration self-contained.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "JobIR35Signal" AS ENUM ('CLIENT_INTENDS_OUTSIDE', 'SDS_ISSUED', 'SMALL_CLIENT_EXEMPT', 'CONTRACT_REVIEW_HELD', 'UNKNOWN', 'INSIDE');

-- CreateEnum
CREATE TYPE "JobSource" AS ENUM ('NATIVE', 'AGGREGATED');

-- CreateEnum
CREATE TYPE "ContractorTrustTier" AS ENUM ('SELF_DECLARED', 'IDENTITY_VERIFIED', 'DOCUMENTS_ON_FILE', 'COMPLIANCE_CURRENT');

-- CreateEnum
CREATE TYPE "ContractorDocType" AS ENUM ('INCORPORATION', 'VAT_CERTIFICATE', 'PI_INSURANCE', 'PL_INSURANCE', 'EL_INSURANCE', 'RIGHT_TO_WORK', 'CV', 'OTHER');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('ON_FILE', 'EXPIRING', 'PENDING', 'MISSING', 'FAILED');

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "verifiedIR35Status",
ADD COLUMN     "classificationConfidence" INTEGER,
ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "extractedSkills" TEXT[],
ADD COLUMN     "ir35Signal" "JobIR35Signal" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "rawDescription" TEXT,
ADD COLUMN     "source" "JobSource" NOT NULL DEFAULT 'NATIVE',
ADD COLUMN     "sourceUrl" TEXT;

-- AlterTable
ALTER TABLE "limited_companies" ADD COLUMN     "companyVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "vatVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "holdsIR35Insurance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ir35InsuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "ir35InsuranceProvider" TEXT,
ADD COLUMN     "parsedProfile" JSONB,
ADD COLUMN     "rightToWorkConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustTier" "ContractorTrustTier" NOT NULL DEFAULT 'SELF_DECLARED';

-- CreateTable
CREATE TABLE "contractor_documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ContractorDocType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',
    "insurer" TEXT,
    "coverLimit" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "r2Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contractor_documents_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "contractor_documents" ADD CONSTRAINT "contractor_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- pgvector HNSW indexes for cosine similarity search (semantic matching).
-- Prisma can't express these from the schema, so they live here.
CREATE INDEX "jobs_embedding_hnsw_idx" ON "jobs" USING hnsw ("embedding" vector_cosine_ops);
CREATE INDEX "users_embedding_hnsw_idx" ON "users" USING hnsw ("embedding" vector_cosine_ops);

