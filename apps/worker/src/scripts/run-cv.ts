import 'dotenv/config';
import { runCvParse } from '../cv/pipeline.js';

// One-off CV parse (no HTTP) — `pnpm cv:parse <userId> <r2Key> <mimeType>`.
const [userId, r2Key, mimeType] = process.argv.slice(2);

if (!userId || !r2Key || !mimeType) {
  console.error('usage: cv:parse <userId> <r2Key> <mimeType>');
  process.exit(1);
}

runCvParse({ userId, r2Key, mimeType })
  .then((r) => {
    console.info('done:', r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
