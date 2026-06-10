// Prisma client singleton — import as `db` (preferred) or `prisma`.
export { prisma, prisma as db } from './client';

// Re-export all generated Prisma types and enums (WorkMode, Role, PosterType,
// SubscriptionType, model types, Prisma namespace) from the ESM client so app
// code imports them from '@outside-ir35-jobs/db' rather than '@prisma/client'.
export * from './generated/prisma/client';
export { Prisma } from './generated/prisma/client';
