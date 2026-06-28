# outsideir35jobs.com

> The specialised job board + contractor-identity platform for UK
> limited-company contractors who only want **outside-IR35** contracts.

**[outsideir35jobs.com](https://outsideir35jobs.com)**

## What it is

A UK contractor shouldn't have to wade through LinkedIn / CWJobs / Jobserve
filtering out inside-IR35 and permanent roles. **outsideir35jobs.com** is one place
that only shows outside-IR35 contracts, with what actually matters up front —
**day rate**, **remote / hybrid / on-site**, **contract length**, the role's
**IR35 signal** (honestly attributed to the client, never asserted by us), and
real project detail.

On top of the board sits the moat: a **verified contractor identity layer**.
Limited-company contractors re-send the same "compliance pack" (certificate of
incorporation, VAT number, PI/PL/EL insurance, right-to-work, CV, day rate,
references) to every agency, over and over. We let them build that profile
**once**, verify the checkable parts against official registers, and share it in
one click.

The job board is the **wedge**. The verified contractor profile is the
**product**.

### How it makes money

- **Job posters** pay to post native listings (launch).
- **Premium contractor subscription** — positioned as a business tool, so it's
  cleanly business-expensable through the contractor's limited company
  (fast-follow).
- **Affiliate revenue** from IR35 insurance / contract-review partners (later).

## ⚠️ The one rule: we never assert IR35 status

Only the **end-client** can legally determine a role's IR35 status (via a Status
Determination Statement). A job board that says "verified outside IR35" is
making a claim it has no authority to make. So we **never** say "verified
outside IR35" / "guaranteed outside IR35" / "IR35-compliant". We surface only
**(1)** what the client claims (attributed, timestamped, with their evidence)
and **(2)** objectively checkable facts about the contractor (company exists,
VAT valid, insurance on file and in-date). Trust is **tiered and start-light**.

**→ Read [`docs/ir35-trust-model.md`](./docs/ir35-trust-model.md) before
touching any IR35-related code or copy.**

## Architecture

A **pnpm + Turborepo monorepo** (mirroring the sister project `chunky-crayon`):

```
outside-ir35-jobs/                 # repo root (renamed from outside-ir35-jobs-web)
├── apps/
│   ├── web/                      # Next.js web app
│   ├── mobile/                # Expo / React Native app (later)
│   └── worker/                # AI worker: aggregation + blog crons (Claude + Perplexity)
├── packages/
│   ├── db/                        # Prisma + Neon adapter (schema, client)
│   ├── storage/                   # Cloudflare R2 wrapper (CVs, incorporation/insurance docs)
│   └── ui/                        # shared UI
└── docs/                          # platform docs (start here)
```

- **DB:** Neon Postgres (dev/prod branches), `pgvector` for semantic matching.
- **Storage:** Cloudflare **R2** (documents).
- **AI:** Claude (classification, extraction, verification, blog) + Perplexity
  (blog research), on cron — same pattern as chunky-crayon.
- **Package manager:** **pnpm** (migrating off bun).

> Today the repo is still a **standalone Next.js app**; the monorepo conversion
> is planned — see [`docs/monorepo-migration.md`](./docs/monorepo-migration.md).

## 📚 Docs

Start with **[`docs/README.md`](./docs/README.md)**. Index:

| Doc                                                          | What it covers                                                                   |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| [`docs/ir35-trust-model.md`](./docs/ir35-trust-model.md)     | **Read first.** Trust model — enums, tiers, copy rules, current IR35 law (2026). |
| [`docs/strategy.md`](./docs/strategy.md)                     | Cold-start / supply-seeding, phased build order, competition, flywheel.          |
| [`docs/ai-features.md`](./docs/ai-features.md)               | AI roadmap: launch / fast-follow / later.                                        |
| [`docs/monorepo-migration.md`](./docs/monorepo-migration.md) | pnpm + Turborepo conversion + dependency upgrades.                               |
| [`docs/monetisation.md`](./docs/monetisation.md)             | Revenue lines, pricing, business-expense angle, guardrails.                      |

## Getting started (current standalone app)

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires a `.env` with at least `DATABASE_URL` / `DATABASE_URL_UNPOOLED` (Neon),
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, and `NEXT_AUTH_SECRET`.

> Note: NextAuth is on v5 (`beta`) but the `app/api/auth/[...nextauth]` route is
> not yet wired, so auth is currently non-functional — fixed as part of the
> migration.
