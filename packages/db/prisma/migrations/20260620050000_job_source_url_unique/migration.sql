-- Unique sourceUrl so the aggregation worker can upsert idempotently (re-running
-- a scrape updates rather than duplicates). NATIVE jobs have null sourceUrl;
-- Postgres treats nulls as distinct, so this is safe. (Only the real change is
-- authored here — the spurious HNSW DROP INDEX lines `migrate diff` emits are
-- omitted; index-neutral.)
CREATE UNIQUE INDEX "jobs_sourceUrl_key" ON "jobs"("sourceUrl");
