/* eslint-disable no-param-reassign */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting the database connection limit during hot-reload.
// https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }]
        : undefined,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
