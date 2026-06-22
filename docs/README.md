# outsideir35.jobs — Platform Docs

> The specialised job board + contractor-identity platform for UK
> limited-company contractors who only want **outside-IR35** contracts.

This folder is the source of truth for **what the platform is, why it exists,
and how it's being built**. It's written for both humans and agents — read it
before doing any substantial work so you understand the domain, the trust model,
and the build order.

## What this is

A UK contractor like the founder doesn't want to wade through
LinkedIn/CWJobs/Jobserve filtering out inside-IR35 and permanent roles. They
want **one place that only shows outside-IR35 contracts**, with the things that
actually matter surfaced up front:

- **Day rate** (transparent, not "competitive")
- **Remote / hybrid / on-site**
- **Contract length**
- **IR35 signal** — what the client says about the role's IR35 status, honestly
  attributed
- **Project detail**

On top of the board sits the real moat: a **verified contractor identity
layer**. A limited-company contractor re-sends the same "compliance pack"
(certificate of incorporation, VAT number, PI/PL/EL insurance certificates,
right-to-work, CV, day rate, references) to every agency, over and over. We let
them **build that profile once**, verify the checkable parts against official
registers, and share it in one click.

The job board is the **wedge**. The verified contractor profile is the
**product**.

## Who the user is

- UK contractor operating through their own **limited company (PSC)**.
- Has money to spend and can **expense a premium subscription as a business
  cost** (see [`ir35-trust-model.md`](./ir35-trust-model.md) and
  [`monetisation.md`](./monetisation.md)).
- Tired of generic boards. Wants signal, transparency, and to stop re-sending
  documents.

## The business

- **Charge job posters** to post native listings (live at launch).
- **Premium contractor subscription** (fast-follow) — positioned as a business
  tool so it's cleanly business-expensable.
- **Affiliate revenue** from IR35 insurance / contract-review partners (later).

Inspiration: **pocitjobs.com** (People of Colour in Tech) — a niche board with a
young founder who sustains himself and a small team. Content-first,
community-led, monetised via paid listings + newsletter sponsorship. We aim to
be a **far more modern, top-tier UI/UX** take on that playbook for the
outside-IR35 niche. See [`strategy.md`](./strategy.md).

## The critical constraint: we never assert IR35 status

This is the single most important thing to understand about the platform.

**Only the end-client can legally determine a role's IR35 status** (via a Status
Determination Statement). A job board that asserts "verified outside IR35" is
making a claim it has no authority to make and exposes itself to
misrepresentation / negligent- misstatement risk. So we **never** say "verified
outside IR35". We only surface:

1. **What the client claims** (attributed, timestamped, with any evidence they
   supply), and
2. **Objectively checkable facts about the contractor** (company exists, VAT
   valid, insurance doc on file and in-date).

Trust is **tiered and start-light**. The full design — including the exact
enums, the copy rules, and the legal grounding — is in
**[`ir35-trust-model.md`](./ir35-trust-model.md)**. Read it before writing any
IR35-related code or copy.

## Architecture (target)

A **pnpm + Turborepo monorepo** mirroring the conventions of the sister project
`chunky-crayon`:

```
outside-ir35-jobs/                 # repo root (renamed from outside-ir35-jobs-web)
├── apps/
│   ├── web/                      # Next.js web app (existing app, moved in)
│   ├── outside-ir35-jobs-mobile/  # Expo / React Native app (later)
│   └── outside-ir35-jobs-worker/  # AI worker: aggregation + blog crons (Claude + Perplexity)
├── packages/
│   ├── db/                        # Prisma 7 + Neon adapter, schema, generated client
│   ├── storage/                   # Cloudflare R2 wrapper (CVs, incorporation/insurance docs)
│   └── ui/                        # shared UI (as needed)
├── docs/                          # this folder
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

- **Database:** Neon Postgres with **dev and prod branches**; `pgvector` enabled
  early for semantic matching.
- **Storage:** Cloudflare **R2** for documents (CVs, incorporation docs,
  insurance certs).
- **AI:** Claude (classification, extraction, verification triage, blog) +
  Perplexity (research for the auto-generated blog), running on cron — same
  pattern as chunky-crayon.
- **Package manager:** **pnpm** (migrating off bun).

Full migration plan: **[`monorepo-migration.md`](./monorepo-migration.md)**.

## Doc index

| Doc                                                | What it covers                                                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`ir35-trust-model.md`](./ir35-trust-model.md)     | **Read first.** The legally-grounded trust model — enums, tiers, copy rules, disclaimers, current IR35 law (2026). |
| [`strategy.md`](./strategy.md)                     | Cold-start / supply-seeding strategy, phased build order, competitive landscape, monetisation.                     |
| [`ai-features.md`](./ai-features.md)               | AI roadmap: launch / fast-follow / later, with implementation notes and cross-cutting rules.                       |
| [`monorepo-migration.md`](./monorepo-migration.md) | Step-by-step pnpm + Turborepo conversion mirroring chunky-crayon, plus dependency upgrades.                        |
| [`monetisation.md`](./monetisation.md)             | Revenue lines, pricing benchmarks, the business-expense angle, guardrails.                                         |
| [`mobile.md`](./mobile.md)                         | The React Native / Expo app: structure, the `/api/mobile/*` layer, native Google/Apple auth + bearer tokens.       |

## Working principles for agents

- **Never** write the words "verified outside IR35", "guaranteed outside IR35",
  or "IR35-compliant" as a platform assertion. See the trust model.
- The IR35 knowledge base **ages fast** — EASI→FWA (Apr 2026), PGMOL (2024)
  already invalidated earlier "facts". Treat IR35 legal content as a maintained
  living asset and re-check against primary sources (gov.uk, HMRC) before
  publishing guidance.
- **Supply-first**: poster-side matching is worthless until the verified
  contractor pool is dense. Prioritise seeker-side acquisition. See
  `strategy.md`.
- Keep monetisation to **advertising + SaaS subscription + affiliate**. Do
  **not** take a cut of placements or handle payments between client and
  contractor — that risks reclassification as an employment business / fee-payer
  and pulls us into the tax chain.
