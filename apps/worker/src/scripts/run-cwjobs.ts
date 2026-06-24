import 'dotenv/config';
import { runCwjobsAggregation } from '../pipeline.js';

// One-off CWJobs aggregation run (no HTTP) — `pnpm aggregate:cwjobs`.
// Optional first arg = limit.
const limit = Number(process.argv[2]) || undefined;

runCwjobsAggregation({ limit })
  .then((r) => {
    console.info('done:', r);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
