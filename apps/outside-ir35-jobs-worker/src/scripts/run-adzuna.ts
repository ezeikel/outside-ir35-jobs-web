import 'dotenv/config';
import { runAdzunaAggregation } from '../pipeline.js';

// One-off Adzuna aggregation run (no HTTP) — `pnpm aggregate:adzuna`.
// Optional first arg = limit.
const limit = Number(process.argv[2]) || undefined;

runAdzunaAggregation({ limit })
  .then((r) => {
    console.info('done:', r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
