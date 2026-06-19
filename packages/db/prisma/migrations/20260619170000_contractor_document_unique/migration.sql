-- One document per type per contractor — lets the upload action upsert.
-- (Index-neutral re: pgvector: we author ONLY the real change here, so the
-- spurious HNSW DROP INDEX lines `prisma migrate diff` emits are omitted.)
CREATE UNIQUE INDEX "contractor_documents_userId_type_key" ON "contractor_documents"("userId", "type");
