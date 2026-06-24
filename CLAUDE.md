# Claude Code Context

> outsideir35.jobs — a specialised job board + contractor-identity platform for
> UK limited-company contractors who only want **outside-IR35** contracts.
> Full platform docs live in [`docs/`](./docs/README.md) — read those for
> product/strategy; this file is the engineering operating manual.

## ⚠️ The one product rule: we never assert IR35 status

Only the **end-client** can legally determine a role's IR35 status (via a Status
Determination Statement). A job board that says "verified outside IR35" is making
a claim it has no authority to make. So we **never** write the words "verified
outside IR35", "guaranteed outside IR35", or "IR35-compliant" as a platform
assertion — anywhere (listings, profiles, signup, marketing, blog, mobile). We
surface only (1) what the client claims (attributed + timestamped) and (2)
objectively checkable facts about the contractor. **Read
[`docs/ir35-trust-model.md`](./docs/ir35-trust-model.md) before touching any
IR35-related code or copy.** The IR35 knowledge base ages fast (EASI→FWA, PGMOL) —
re-check primary sources (gov.uk/HMRC) before publishing guidance.

## Database (Neon)

Neon PostgreSQL with branch-based development:

- **Project**: `outside-ir35-jobs` (`muddy-lab-94915016`)
- **Organization**: Chewy Bytes (`org-fragrant-frog-77141390`)

### Branches

| Branch          | ID                          | Usage                              |
| --------------- | --------------------------- | ---------------------------------- |
| **production**  | `br-floral-wave-a49prl8s`   | Production data (deployed site)    |
| **development** | `br-holy-glade-a45m7ttr`    | Local development data (localhost) |

**Important**: When testing on `localhost`, always query the **development**
branch. `apps/web/.env.local` points `DATABASE_URL` /
`DATABASE_URL_UNPOOLED` at the dev branch. `pgvector` is enabled on both branches.

### Migrations (Prisma 7)

**CRITICAL rules — violating any causes dev↔prod drift:**

1. **Never use `prisma db push`** — bypasses migration history entirely.
2. **Never hand-write migration files.** Always run `pnpm db:migrate` from
   `packages/db`. The CLI is the only thing that writes dev's `_prisma_migrations`
   row _and_ generates the correctly-hashed migration folder. Hand-writing the
   SQL leaves dev's history empty for that migration → prod gets the row on merge,
   dev never does → "drift detected" on the next migrate.
3. **Never run raw `ALTER TABLE` / `CREATE TABLE` on Neon** (via MCP, psql, Neon
   console). Any schema change starts as a `packages/db/prisma/schema.prisma` edit.

The DB was originally created via `db push` (no history); a `0_init` baseline
migration was created and `migrate resolve --applied` on both branches. Do not
re-baseline.

#### Workflow

1. Edit `packages/db/prisma/schema.prisma`.
2. `cd packages/db && pnpm db:migrate` — generates the migration AND applies it to
   the dev Neon branch AND writes dev's `_prisma_migrations`.
3. Commit & push migration files to `main`.
4. CI runs `prisma migrate deploy` on production.

#### Commands (run from `packages/db`)

| Command            | Purpose                   | When                    |
| ------------------ | ------------------------- | ----------------------- |
| `pnpm db:migrate`  | Create + apply migration  | After schema changes    |
| `pnpm db:deploy`   | Apply existing migrations | CI/CD only              |
| `pnpm db:generate` | Regenerate Prisma client  | After pulling changes   |
| `pnpm db:status`   | Check dev/prod in sync    | Verifying drift         |
| `pnpm db:push`     | ⛔ **NEVER USE**          | Causes drift            |
| `pnpm db:studio`   | Database GUI              | Debugging               |

## Project Structure

**Monorepo** using Turborepo + pnpm workspaces (mirrors the sister project
`chunky-crayon`'s conventions). On-disk folder may still be `outside-ir35-jobs-web`
pending a rename to `outside-ir35-jobs`.

- `apps/web` — Next.js 16 web app (`@outside-ir35-jobs/web`)
- `apps/mobile` — React Native / Expo app (planned, not yet scaffolded)
- `apps/worker` — AI worker for aggregation + blog crons (planned)
- `packages/db` — Prisma 7 + Neon client (`@outside-ir35-jobs/db`). Server code imports
  `db`/`prisma` from the barrel; **client components import enums/types from
  `@outside-ir35-jobs/db/types`** (browser-safe — keeps the Prisma runtime out of client
  bundles).
- `packages/storage` — Cloudflare R2 client (`@outside-ir35-jobs/storage`), drop-in for
  `@vercel/blob` (`put`/`del`/`list`/`exists`). For CVs, incorporation/insurance docs.

## Stack notes

- **Next.js 16** (Turbopack default), **React 19**, **Tailwind 4** (CSS-first, no
  `tailwind.config` — theme lives in `global.css` `@theme`), **Sentry 10**
  (`instrumentation.ts` + `instrumentation-client.ts`), **NextAuth v5** (Auth.js;
  route at `app/api/auth/[...nextauth]/route.ts`, needs `AUTH_SECRET`).
- **pnpm overrides** pin `next`, `@types/react*`, and the `typescript-eslint` family
  to single versions — needed so transitive deps don't pull a stale nested copy
  (e.g. next-auth's nested Next 14 broke the route types). Keep React in sync across
  all workspaces (pnpm isolation → version mismatch = "Invalid hook call").
- `.env.local` lives in the **app dir** (`apps/web/.env.local`),
  not the repo root — that's where Next and `packages/db/prisma.config.ts` read it.

## Vercel Deployment

The web app has its own Vercel project. **Run Vercel CLI from the app dir**, never
the repo root (monorepo — a root `.vercel` can only point at one project). Set the
project's **Root Directory** to `apps/web`, and add `AUTH_SECRET`
+ the Neon `DATABASE_URL` / `DATABASE_URL_UNPOOLED` env vars.

## Commits

Semantic commit style (`type(scope): message`). One-liners, succinct but covering
the work. **Do not attribute Claude in commit messages. Never include
Co-Authored-By lines.**

## Server actions are the source of truth; routes + crons wrap them

Business logic lives in server actions (`app/actions/*.ts`). HTTP endpoints
(`app/api/*/route.ts`) and cron routes are thin wrappers that authenticate, validate
the body, call the action, and return its result. This is what lets the (planned)
React Native app and the web app share one implementation — RN can only call HTTP,
so the endpoint must _wrap_ an action, not _be_ the logic. If a route handler grows
past ~10 lines of business logic, extract an action. (Webhooks from Stripe/Resend/R2
are integration boundaries — keep those in routes.)

## Investigating before deleting

Before declaring a table, R2 prefix, env var, migration, or seed datum "safe to
drop", grep the **whole repo** (including the worker + all `scripts/`), check
`vercel.json` crons, raw SQL (`$queryRaw`/`$executeRaw`), committed migrations/seeds
(a committed migration or seed = intentional, even if the table is empty), and
`.github/workflows/`. When in doubt, leave it and ask — a kept-but-empty table costs
nothing; a wrongly-dropped one costs hours.

## Testing

**Vitest** (not Jest) for unit tests; config at `apps/.../vitest.config.mts`
(jsdom). Test extracted pure logic — never RSCs / Next routing. Anything where a
silent bug costs money or breaks the core experience (day-rate/price math, IR35
classification confidence, doc-expiry logic, signing/verification) gets a unit test,
shipped in the same commit as the logic (`foo.ts` → `foo.test.ts` beside it).
Run `pnpm test` before pushing logic changes; `pnpm build` for page changes.

## Linting

ESLint 9 flat config (`eslint.config.mjs`, `eslint-config-airbnb-extended` +
`import-x` + `@stylistic`). `pnpm lint` / `pnpm lint:fix`. Prettier via
`eslint-plugin-prettier`.

## Documentation

`docs/` holds permanent reference. The platform/strategy docs there are the source
of truth for what the product is and the build order. Add a doc when answering "how
does X work?" needs state across more than one of: web app, worker, DB schema, R2,
cron, CI. See [`docs/README.md`](./docs/README.md).

## GitHub CLI

Use `gh` for GitHub operations on repos I own. (Remote: `ezeikel/contract-jobs-web`.)
