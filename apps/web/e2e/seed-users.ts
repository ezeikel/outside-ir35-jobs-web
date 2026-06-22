import { db as prisma } from '@outside-ir35-jobs/db';
import { PosterType, Role } from '@outside-ir35-jobs/db/types';

// Standalone seed for the e2e test users, run as its OWN process via `tsx` from
// e2e/global-setup.ts. It must NOT be imported into the Playwright config
// process: Playwright's TS transform chokes on the generated Prisma client
// (CommonJS `exports`), so the DB client is only ever touched here, under tsx.

// Keep these in sync with e2e/helpers/auth.ts (which only needs the strings, not
// the Prisma client).
export const CONTRACTOR_EMAIL = 'e2e-contractor@outsideir35.test';
export const POSTER_EMAIL = 'e2e-poster@outsideir35.test';

const seed = async (): Promise<void> => {
  await prisma.user.upsert({
    where: { email: CONTRACTOR_EMAIL },
    update: { role: Role.JOB_SEEKER, onboardedAt: new Date() },
    create: {
      email: CONTRACTOR_EMAIL,
      name: 'E2E Contractor',
      role: Role.JOB_SEEKER,
      onboardedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: POSTER_EMAIL },
    update: {
      role: Role.JOB_POSTER,
      posterType: PosterType.DIRECT,
      onboardedAt: new Date(),
    },
    create: {
      email: POSTER_EMAIL,
      name: 'E2E Poster',
      role: Role.JOB_POSTER,
      posterType: PosterType.DIRECT,
      onboardedAt: new Date(),
    },
  });
};

seed()
  .then(async () => {
    await prisma.$disconnect();
    process.stdout.write('e2e users seeded\n');
  })
  .catch(async (err) => {
    await prisma.$disconnect();
    process.stderr.write(`e2e seed failed: ${err}\n`);
    process.exit(1);
  });
