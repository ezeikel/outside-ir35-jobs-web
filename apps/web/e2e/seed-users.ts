import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { db as prisma } from '@outside-ir35-jobs/db';
import { PosterType, Role } from '@outside-ir35-jobs/db/types';
import { SignJWT } from 'jose';

// Standalone seed for the e2e test users, run as its OWN process via `tsx` from
// e2e/global-setup.ts. It must NOT be imported into the Playwright config
// process: Playwright's TS transform chokes on the generated Prisma client
// (CommonJS `exports`), so the DB client is only ever touched here, under tsx.

// Keep these in sync with e2e/helpers/auth.ts (which only needs the strings, not
// the Prisma client).
export const CONTRACTOR_EMAIL = 'e2e-contractor@outsideir35.test';
export const POSTER_EMAIL = 'e2e-poster@outsideir35.test';

// Where the contractor's mobile bearer token is written for the saved-jobs e2e
// (the mobile /api/mobile/* endpoints are bearer-auth, not cookie — the spec
// reads this file). Mirrors lib/mobile/session.ts (which is `server-only`, so we
// inline the same HS256 sign here under tsx).
const MOBILE_TOKEN_FILE = path.join(__dirname, '.auth', 'mobile-token.json');

const mintMobileToken = async (
  userId: string,
  email: string,
): Promise<string> => {
  const s = process.env.AUTH_SECRET || process.env.NEXT_AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET not set — cannot mint e2e mobile token');
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('outsideir35jobs.com')
    .setAudience('outsideir35jobs.com/mobile')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(s));
};

const seed = async (): Promise<void> => {
  const contractor = await prisma.user.upsert({
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

  // Start the saved-jobs e2e from a clean slate, and write the contractor's mobile
  // bearer token for it to use.
  await prisma.savedJob.deleteMany({ where: { userId: contractor.id } });
  const token = await mintMobileToken(contractor.id, CONTRACTOR_EMAIL);
  mkdirSync(path.dirname(MOBILE_TOKEN_FILE), { recursive: true });
  writeFileSync(
    MOBILE_TOKEN_FILE,
    JSON.stringify({ userId: contractor.id, token }),
  );
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
