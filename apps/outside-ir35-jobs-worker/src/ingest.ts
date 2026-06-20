import { db, Prisma } from '@outside-ir35-jobs/db';
import type { Classification } from './classify/classify.js';
import type { ScrapedJob } from './scrapers/jobserve.js';

/**
 * Upsert one classified listing as a source-attributed AGGREGATED job, keyed on
 * sourceUrl (idempotent — re-runs update, never duplicate). Then write the
 * pgvector embedding via raw SQL (the column is Prisma-Unsupported).
 *
 * Honesty: source=AGGREGATED, sourceUrl links back to origin, ir35Signal is
 * whatever the classifier honestly assigned (UNKNOWN by default), confidence is
 * stored for the UI. We store the short extract as `description`, NOT a full body
 * (we index, not re-publish). userId is null (no poster owns a scraped row).
 */
export const ingestJob = async (
  scraped: ScrapedJob,
  cls: Classification,
  embedding: number[] | null,
): Promise<{ id: string; created: boolean }> => {
  const data = {
    position: scraped.position,
    companyName: scraped.companyName,
    description: scraped.description,
    keywords: cls.skills,
    extractedSkills: cls.skills,
    rawDescription: scraped.description,
    location: {
      address: cls.location ?? scraped.location,
    } as Prisma.InputJsonValue,
    dayRate: cls.dayRate,
    workMode: cls.workMode ?? 'ON_SITE',
    contractLength: cls.contractLengthDays,
    ir35Signal: cls.ir35Signal,
    classificationConfidence: cls.confidence,
    source: 'AGGREGATED' as const,
    sourceUrl: scraped.sourceUrl,
    // Aggregated index entries: we don't host the application — link to source.
    howToApply: `View and apply on the original listing: ${scraped.sourceUrl}`,
    applicationEmail: '',
  };

  const existing = await db.job.findUnique({
    where: { sourceUrl: scraped.sourceUrl },
    select: { id: true },
  });

  const job = await db.job.upsert({
    where: { sourceUrl: scraped.sourceUrl },
    create: data,
    update: data,
    select: { id: true },
  });

  // Embedding column is Unsupported() in Prisma → raw SQL, cast a JSON array to
  // ::vector. This is the repo's first raw-SQL write site.
  if (embedding) {
    const vec = JSON.stringify(embedding);
    await db.$executeRaw`UPDATE "jobs" SET "embedding" = ${vec}::vector WHERE "id" = ${job.id}`;
  }

  return { id: job.id, created: !existing };
};
