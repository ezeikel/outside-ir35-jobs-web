// Prisma client singleton — import as `db` (preferred) or `prisma`.
export { prisma, prisma as db } from './client';

// Re-export all generated Prisma types and enums (WorkMode, Role, PosterType,
// SubscriptionType, model types, Prisma namespace) so app code imports them
// from '@outside-ir35/db' rather than '@prisma/client' directly.
export * from '@prisma/client';
