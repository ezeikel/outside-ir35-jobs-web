import 'dotenv/config';
import { runJobserveAggregation } from '../pipeline.js';

// One-off Jobserve aggregation run (no HTTP) — `pnpm aggregate:jobserve`.
// Optional first arg = limit.
const limit = Number(process.argv[2]) || undefined;

runJobserveAggregation({ limit })
  .then((r) => {
    console.info('done:', r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
