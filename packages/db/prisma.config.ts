import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local from the web app for local development.
// On Vercel, env vars are injected directly into process.env.
dotenv.config({
  path: path.resolve(__dirname, '../../apps/web/.env.local'),
});

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

// Shadow DB is only used by `prisma migrate diff --from-migrations ...` in the
// CI drift-check job (Prisma 7 removed the --shadow-database-url CLI flag, so it
// must be configured here). Local dev + `prisma migrate deploy` don't need it,
// so only set it when the env var is present.
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
