#!/usr/bin/env bash
#
# Schema ↔ migrations parity check, tolerant of pgvector artifacts Prisma can't model.
#
# `prisma migrate diff --from-migrations … --to-schema …` replays our migrations
# into a shadow DB, introspects it, and diffs against schema.prisma. Our Phase 1
# migration creates two HNSW indexes on `vector` columns:
#
#     CREATE INDEX "jobs_embedding_hnsw_idx"  ON "jobs"  USING hnsw (...);
#     CREATE INDEX "users_embedding_hnsw_idx" ON "users" USING hnsw (...);
#
# Prisma cannot express an index on an `Unsupported("vector(1536)")` column in
# schema.prisma, so the diff ALWAYS wants to drop them — a permanent false
# "drift" that has nothing to do with the dev/prod-drift this guard exists to
# catch (a column added to schema.prisma without a migration, or a hand-written
# migration that doesn't match the schema).
#
# So: run the diff as a SQL script, strip comments/blanks, and ignore lines that
# are exactly `DROP INDEX "<table>_embedding_hnsw_idx";`. If anything else
# survives, that's real drift → fail. If only the benign HNSW drops (or nothing)
# remain → in sync.
#
# Requires: DATABASE_URL + SHADOW_DATABASE_URL in the environment (the shadow DB
# is where the migrations are replayed; Prisma 7 reads it from prisma.config.ts).
set -uo pipefail

cd "$(dirname "$0")/.."

# `migrate diff --script` prints the would-be SQL. We don't use --exit-code here
# because we need to inspect WHICH statements differ, not just whether any do.
# Capture stdout+stderr and the exit code separately (no `set -e`, so a non-zero
# exit doesn't abort before we can inspect it).
set +e
diff_sql="$(pnpm exec prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema prisma/schema.prisma \
  --script 2>&1)"
diff_status=$?

# `prisma migrate diff` exits non-zero on engine errors (bad shadow DB, invalid
# schema). --script doesn't set the exit code for drift, so a non-zero here is a
# genuine failure we must surface, not drift.
if [ "$diff_status" -ne 0 ]; then
  echo "::error::prisma migrate diff failed (exit $diff_status):"
  printf '%s\n' "$diff_sql"
  exit "$diff_status"
fi

# NOTE: `set -e` stays OFF below — the `grep -v` filters legitimately exit 1 when
# they filter every line (e.g. an empty/in-sync diff), which must not abort us.

# Prisma prepends a config-load line to stdout; drop it, then drop SQL comments
# (-- …) and blank lines, leaving only executable statements.
statements="$(printf '%s\n' "$diff_sql" \
  | grep -v 'Loaded Prisma config' \
  | grep -vE '^\s*(--.*)?$' || true)"

# Remove the benign, expected pgvector HNSW index drops. Whatever remains is
# drift the guard should fail on.
residual="$(printf '%s\n' "$statements" \
  | grep -vE '^\s*DROP INDEX "[a-z_]+_embedding_hnsw_idx";\s*$' \
  | grep -vE '^\s*$' || true)"

if [ -n "$residual" ]; then
  echo "::error::Drift detected between schema.prisma and migrations/"
  echo ""
  echo "schema.prisma no longer matches what applying migrations/ would produce."
  echo "Statements that don't reconcile (ignoring the expected pgvector HNSW indexes):"
  echo ""
  printf '%s\n' "$residual"
  echo ""
  echo "Either:"
  echo "  • schema.prisma was edited without running 'pnpm db:migrate', or"
  echo "  • a migration.sql was hand-written with SQL that doesn't match."
  echo ""
  echo "Fix: in packages/db, revert the drift and run"
  echo "     'pnpm db:migrate --name <descriptive_name>'"
  echo "     so Prisma generates the correct migration."
  exit 1
fi

if [ -n "$statements" ]; then
  echo "✓ schema.prisma and migrations/ are in sync"
  echo "  (ignored the expected pgvector HNSW index drift that Prisma can't model)"
else
  echo "✓ schema.prisma and migrations/ are in sync"
fi
