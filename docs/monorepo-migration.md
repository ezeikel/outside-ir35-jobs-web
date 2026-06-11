# Monorepo Migration Plan

Convert the standalone Next.js app into a **pnpm + Turborepo monorepo**
mirroring the conventions of the sister project `chunky-crayon`, and bring
~1-year-stale dependencies current.

> **Folder rename:** the repo moves from `outside-ir35-jobs-web` →
> **`outside-ir35-jobs`** (it's no longer just a website — it will contain web,
> mobile, and worker apps).

---

## Current state (verified)

- Standalone **Next.js 14.2.3** app, App Router. Package manager: **bun**
  (`bun.lockb`, `bunfig.toml`) — migrating to **pnpm**.
- **Prisma 5.13**, schema only — **NO `prisma/migrations/` folder**.
  `lib/prisma.ts` uses the **old `new Pool({ connectionString })` constructor**.
- **NextAuth `beta` (v5)**, Google-only — but **no `app/api/auth/[...nextauth]`
  route**, so **auth is currently non-functional**. Needs wiring +
  `AUTH_SECRET`.
- Uses **`@vercel/blob` + `@vercel/postgres`** → to be dropped (R2 + Neon
  instead).
- Stale majors: React 18, Tailwind 3.4, Sentry 7, `@neondatabase/serverless`
  0.9, FontAwesome 6, ESLint 8, **Jest** (chunky-crayon uses **Vitest**).
- Many stray root `tsconfig.*.tsbuildinfo` files to clean up.

## Target (chunky-crayon conventions)

- Scope **`@outside-ir35-jobs/*`** (cf. `@one-colored-pixel/*`).
- `pnpm-workspace.yaml` → `apps/*`, `packages/*`.
- `turbo.json` with `build`/`dev`/`lint`/`test`/`db:generate` tasks + a **strict
  `env` allowlist** (turbo fails builds for env vars not listed — port the
  relevant subset).
- `.npmrc` with `node-linker=hoisted`, `shamefully-hoist=true`,
  `public-hoist-pattern=*`, and the FontAwesome registry/token lines.
- Root `package.json`: `packageManager: pnpm@<ver>`, husky + lint-staged,
  `prettier`, `turbo`, `typescript`, `vitest`;
  `postinstall: prisma generate --schema=packages/db/...`.
- **`packages/db`** is the canonical Prisma 7 + Neon package: `prisma.config.ts`
  (dotenv-loads env), generator → `src/generated/prisma` (gitignored), `tsc` →
  `dist`, exports a Neon-adapter client singleton as `prisma` (and `db`).
- **`packages/storage`**: thin `@aws-sdk/client-s3` wrapper for **Cloudflare
  R2**.

```
outside-ir35-jobs/
├── apps/
│   ├── web/                       # the existing Next app, moved in
│   ├── outside-ir35-jobs-mobile/   # Expo / React Native (scaffolded later)
│   └── outside-ir35-jobs-worker/   # AI worker: aggregation + blog crons
├── packages/
│   ├── db/        # Prisma 7 + Neon adapter
│   ├── storage/   # R2 wrapper
│   └── ui/        # shared UI (as needed)
├── docs/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Ordered plan

### Step 0 — Baseline Prisma against live Neon (CRITICAL — data safety, do first)

There are no migrations and the DB is live. Running `migrate dev` now could
**drop/recreate tables**. Before anything else:

1. `prisma migrate diff --from-empty --to-schema-datamodel ... --script` → write
   as the first migration.
2. `prisma migrate resolve --applied <that-migration>` so Prisma treats the live
   schema as already applied and **never recreates it**.
3. Verify against **Neon dev branch** first, then prod.

> Confirm **Neon dev/prod branches** exist (the founder believes they're set up)
> before running anything destructive. Take a branch/snapshot first.

### Step 1 — Scaffold the monorepo root

- Add `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, root `package.json` (scope
  `@outside-ir35`, husky, lint-staged, turbo, prettier, vitest, typescript).
- **Delete** `bun.lockb`, `bunfig.toml`, all root `tsconfig.*.tsbuildinfo`,
  `node_modules`.
- Port the `pnpm.overrides` pattern (React types pinning etc.) as needed.

### Steps 2–3 — Move app + extract db package

- `git mv` the Next app → `apps/web` (preserves history).
- `git mv prisma/schema.prisma` → `packages/db/prisma/schema.prisma`; create
  `packages/db/{package.json,tsconfig.json,prisma.config.ts,src/index.ts}`.
- Switch the client to the **`PrismaNeon({ connectionString })`** adapter
  pattern (drop the bare `Pool`), export `prisma`/`db` singleton.
- **Land the schema extensions now** (so later phases don't migrate against a
  busy DB) — see [`ir35-trust-model.md`](./ir35-trust-model.md) and
  [`ai-features.md`](./ai-features.md):
  - Replace `Job.verifiedIR35Status Boolean` with `ir35Signal JobIR35Signal` +
    `classificationConfidence`, `source`, `sourceUrl`, `rawDescription`,
    `extractedSkills`, `embedding` (pgvector).
  - Seeker: `trustTier ContractorTrustTier`, `holdsIR35Insurance` (+ provider,
    expiry), `parsedProfile`, `embeddings`.
  - Documents: insurer / cover-limit / **expiry** + renewal tracking + R2 keys.
  - **Enable `pgvector` on Neon.**

### Steps 4–5 — Rewire imports + add storage

- Repoint `WorkMode`/enum + `prisma` imports across the web app to
  `@outside-ir35-jobs/db`.
- Add **`packages/storage`** (R2 via `@aws-sdk/client-s3`); **drop
  `@vercel/blob` and `@vercel/postgres`**.

### Steps 6–9 — Upgrade one major at a time, then verify

Upgrade **one major per commit**, building between each:

- **Next 14 → 16 / React 18 → 19** — async
  `cookies()/headers()/params/searchParams` (must `await`);
  `serverComponentsExternalPackages` renamed to `serverExternalPackages`.
- **NextAuth v5** — different export shape; **wire the missing
  `app/api/auth/[...nextauth]/route.ts`**, add `AUTH_SECRET`, likely add the
  Prisma adapter. (Auth is non-functional today — this fixes it.)
- **Tailwind 3 → 4** — CSS-first config rewrite; watch `lightningcss` CI
  breakage.
- **Sentry 7 → 10** — new `instrumentation.ts` files.
- **ESLint 8 → 9** flat config; **Jest → Vitest** (match chunky-crayon).
- **FontAwesome** — needs the `.npmrc` registry + `FONTAWESOME_NPM_AUTH_TOKEN`.
- Verify with `turbo build`; update **Vercel Root Directory** to
  `apps/web`.

### Later — scaffold the other apps

- `apps/outside-ir35-jobs-worker` — AI worker (aggregation + blog crons,
  Claude + Perplexity), mirroring chunky-crayon's worker.
- `apps/outside-ir35-jobs-mobile` — Expo / React Native, consuming the same
  db/API.

---

## Risk register

1. **Prisma data loss** — no migrations + live Neon. → Step 0 baselining;
   dev-branch first; snapshot before prod.
2. **Next 16 / React 19 breaking** — async
   `cookies/headers/params/searchParams`; renamed config keys. → Upgrade in
   isolation, fix call sites.
3. **NextAuth v5 + missing route** — auth non-functional today; v5 export shape
   differs; needs `AUTH_SECRET` + adapter. → Wire the route as part of the
   upgrade.
4. **Tailwind 4 + Sentry 10 + lightningcss** — CSS-first rewrite,
   instrumentation files, CI breakage. → One at a time, watch CI.
5. **pnpm hoisting / turbo strict env** — phantom deps surface under pnpm;
   turbo's strict env allowlist **breaks builds for unlisted env vars**;
   FontAwesome token required. → Port `.npmrc` hoisting + the turbo `env` list
   carefully.
