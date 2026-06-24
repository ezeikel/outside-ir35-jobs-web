import 'dotenv/config';
import { db } from '@outside-ir35-jobs/db';
import { embedJob } from '../embed.js';

/**
 * One-off backfill: embed every active job that has no embedding yet (e.g. native
 * jobs created before embed-on-create landed, or seed data). Idempotent — re-runs
 * only touch still-unembedded rows. Targets whatever DB the .env points at.
 *
 *   pnpm --filter @outside-ir35-jobs/worker exec tsx --env-file=.env src/scripts/backfill-embeddings.ts
 */
const main = async () => {
  // The embedding column is Unsupported() in Prisma → find ids via raw SQL.
  const rows = await db.$queryRaw<
    { id: string; position: string; keywords: string[]; description: string }[]
  >`SELECT "id", "position", "keywords", "description" FROM "jobs"
    WHERE "isActive" = true AND "embedding" IS NULL`;

  console.info(`[backfill] ${rows.length} jobs need embedding`);
  let done = 0;
  for (const job of rows) {
    const embedding = await embedJob({
      position: job.position ?? '',
      skills: job.keywords ?? [],
      description: job.description ?? '',
    });
    if (!embedding) {
      console.warn(`[backfill] embed failed for ${job.id} — skipping`);
      continue;
    }
    const vec = `[${embedding.join(',')}]`;
    await db.$executeRaw`UPDATE "jobs" SET "embedding" = ${vec}::vector WHERE "id" = ${job.id}`;
    done += 1;
  }
  console.info(`[backfill] embedded ${done}/${rows.length}`);
};

main()
  .then(async () => {
    await db.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
