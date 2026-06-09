// Types-only / enum exports that do NOT import the database client.
// Uses the browser-safe generated client, so this is safe to import from
// client components (no `node:module`, no Prisma runtime pulled in).
//
// Server code imports the client from the package barrel ('@outside-ir35/db');
// client components import enums/types from '@outside-ir35/db/types'.
export * from './generated/prisma/browser';
export { Prisma } from './generated/prisma/browser';
