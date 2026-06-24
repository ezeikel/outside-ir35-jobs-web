import 'dotenv/config';
import { runBlogCron } from '../blog/cron.js';

// One-off blog generation run (no HTTP).
//   pnpm blog:generate                      # random uncovered topic, writes to Sanity
//   pnpm blog:dry                           # dry run, no write
//   pnpm blog:generate -- --topic="..."     # pin a topic (exact or substring)
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('--dryRun');
const topicArg = args.find((a) => a.startsWith('--topic='));
const topicOverride = topicArg
  ? topicArg.slice('--topic='.length).replace(/^['"]|['"]$/g, '')
  : undefined;

runBlogCron({ topicOverride, dryRun })
  .then((r) => {
    console.info('[run-blog] done:', r);
    process.exit(r.status === 'rejected' ? 2 : 0);
  })
  .catch((err) => {
    console.error('[run-blog] uncaught:', err);
    process.exit(1);
  });
