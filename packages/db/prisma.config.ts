import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local from the web app for local development.
// On Vercel, env vars are injected directly into process.env.
dotenv.config({
  path: path.resolve(__dirname, '../../apps/outside-ir35-jobs-web/.env.local'),
});

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
