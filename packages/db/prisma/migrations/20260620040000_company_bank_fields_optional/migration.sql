-- Bank details + address aren't needed to add/verify a company (data
-- minimisation) — make them nullable. (We author only the real change so the
-- spurious HNSW DROP INDEX lines `migrate diff` emits are omitted; index-neutral.)
ALTER TABLE "limited_companies"
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "bankName" DROP NOT NULL,
  ALTER COLUMN "bankAccountNumber" DROP NOT NULL,
  ALTER COLUMN "bankSortCode" DROP NOT NULL;
