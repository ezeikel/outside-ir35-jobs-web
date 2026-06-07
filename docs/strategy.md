# Strategy — Cold-start, Build Order, Competition

How we go from an empty board to a self-sustaining platform. The single biggest
risk is **supply** (the cold-start problem), so the strategy is built around
solving that first.

---

## The cold-start problem (and the cheat code)

A two-sided marketplace has chicken-and-egg: contractors won't come without
jobs; posters won't pay without contractors. Sharpened by a key finding:
**poster-side matching is worthless until the verified contractor pool is
dense.** So you can't lead with paid posting — your paying customers won't pay
until there's an audience.

The inversion that makes this work: **outside-IR35 contracts are already posted
everywhere** (Jobserve, CWJobs, LinkedIn, Technojobs, agency sites). We don't
wait for supply — we **aggregate** it.

### Seed demand (jobs) via AI aggregation — the wedge

- Scrape contract roles, then use the **Claude IR35 classifier** to tag
  `JobIR35Signal` (default `UNKNOWN` when unsure) and extract structured fields
  (rate, mode, length, location, skills). See
  [`ai-features.md`](./ai-features.md).
- Every aggregated listing is **clearly source-attributed and links back to
  origin** — we are an **index**, not a re-publisher of job bodies. This
  mitigates ToS/IP/staleness risk. Dedup + expiry from day one.
- This solves the empty-board problem **and** produces the proprietary
  **day-rate dataset** as a byproduct — which powers SEO, benchmarking, and the
  AI blog.

### Seed supply (contractors) with the compliance-pack value prop — not jobs

- The hook is **"build your verified contractor profile once, stop re-sending
  the same pack to every agency"** — a real, repeatedly-confirmed pain. Identity
  verification (Companies House + VAT) is **free to us via gov APIs**, so T1 is
  a cheap, sticky giveaway even before the board is busy.
- The free **day-rate benchmark** ("see what your skill/region/seniority
  commands, segmented by IR35 status") is a second magnet requiring no
  liquidity, and feeds the SEO loop.

### The flywheel

```
Aggregated jobs (instant inventory)
   → SEO + day-rate content pulls contractors
      → contractors build verified profiles (sticky, free)
         → verified pool reaches density
            → NOW enable matching / alerts
               → NOW charge posters who want access to a dense verified pool
```

**Prioritise seeker-side (contractor) acquisition first** — poster value depends
on pool density.

### Direct-poster seeding (manual, in parallel)

Hand-recruit a small number of genuine outside-IR35 hirers for **native,
first-party listings** that carry richer `JobIR35Signal` values (`SDS_ISSUED`,
`CONTRACT_REVIEW_HELD`):

- **Small clients** (post-6-Apr-2026, who self-determine) and **IR35-savvy
  agencies**.
- These are the **premium, differentiated inventory** the aggregated pool can't
  match, and the first paying customers.

### 2026 tailwinds to lead acquisition messaging with (all verified)

- **April 2024 set-off** has materially de-risked outside-IR35 hiring (use
  illustratively).
- **April 2026 umbrella concurrent J&S liability** pushes demand toward genuine
  PSC work.
- **Higher small-company thresholds** mean a _growing_ share of self-determined
  outside-IR35 work — our exact niche.

---

## Competitive landscape

### pocitjobs.com — the reference (POCIT, People of Colour in Tech)

Founder **Michael Berhane** (co-founded 2015 with Ruth Mesfun). The model the
founder admires: a niche board sustaining a small team. It's a **"media +
community first, job board second"** play:

- **How they grew:** content (interviews, editorial) + a **newsletter as the
  core asset**
  - founder-led Twitter/X presence + community/storytelling. Audience _before_
    monetisation.
- **How they monetise:** paid job postings (core), featured/premium upgrades +
  employer branding, **newsletter sponsorships**, and brand/DEI campaign
  partnerships.
- **What's transferable:**
  1. **Go narrow and valuable** — niche audiences command premium pricing.
  2. **Content is the early product** — interviews, day-rate reports, "how I got
     here".
  3. **Build the newsletter obsessively** — highest-margin channel; CTAs
     everywhere.
  4. **Founder-led social** — be an active voice in the niche.
  5. **Backfill/curate to avoid the empty-board problem** (exactly our
     aggregation wedge).
  6. **Free/cheap posting for the first 20–50 employers**, then introduce paid
     listings.

> Our edge over pocitjobs: a **far more modern, top-tier UI/UX**, plus an **AI
> reasoning layer** (IR35 classification + verified identity) that a content-led
> board doesn't have.

### How contractors find outside-IR35 work today

Jobserve, CWJobs, Technojobs (IT/contract-heavy), LinkedIn (+ filters),
ContractorUK, generalist boards (Reed, Totaljobs, CV-Library, Indeed). IR35
filtering on these is poor — that's the gap. We are a **better filter + an
identity layer**.

### How comparable niche boards seeded supply

RemoteOK, Wellfound/AngelList, Otta, WeWorkRemotely — all used
aggregation/backfill, manual outreach, and free-posting periods to get past
cold-start. Confirms our approach.

---

## Phased build order

Migration/data-safety first (highest-severity risk), then the launch wedge, then
liquidity.

### Phase 0 — De-risk the foundation (before any feature work)

- **Baseline Prisma against live Neon** to prevent data loss: `migrate diff`
  from-empty → `migrate resolve --applied`, so migrate never recreates live
  tables. **Critical** — no migrations folder currently exists. See
  [`monorepo-migration.md`](./monorepo-migration.md).
- Scaffold the monorepo root; stand up **Neon dev/prod branches**; **enable
  pgvector on Neon early**.
- Extend the Prisma schema **now** with all forward-looking fields (see the
  trust model and migration docs) so later phases don't need migrations against
  a busy DB.

### Phase 1 — Launch wedge (aggregation + identity + SEO loop)

- AI IR35 **classifier + structured extraction** on cron → populated,
  source-tagged board.
- **Self-declared (T0)** and **identity-verified (T1)** contractor profiles via
  Companies House + VAT APIs.
- **Day-rate benchmarking** (classifier byproduct, gated on sample size).
- Public job board + job detail pages (partly built) with the full
  `JobIR35Signal` model and disclaimers.
- **Job posting + payment** for native listings (monetisation live at launch).
- R2 document storage wired for the doc tiers to come.

### Phase 2 — Liquidity + trust depth (fast-follow, once pool exists)

- **Document tiers T2/T3:** upload, verification triage (gov API reconcile +
  Claude vision), expiry/renewal tracking, auto-downgrade on lapse.
- **CV parsing → multi-aspect embeddings**; **pgvector HNSW matching** with hard
  filters (outside-only, rate floor, mode, location).
- **AI alerts** ("why-matched") and **one-click pitch tailoring**.
- **AI blog worker** (Claude + Perplexity on cron) + programmatic SEO pages,
  gated on real data.
- Contractor **premium subscription** live.

### Phase 3 — Mobile + expansion

- **React Native app** (alerts, profile management, on-the-go applying are
  mobile-native; benefits from a stable API surface and a dense pool).
- Insurance / contract-review **affiliate integrations** (revenue + the safest
  trust signal).
- Poster-side **job-spec writer** (low risk, can pull earlier if capacity
  allows).

### Phase 4 — Higher-risk / pool-dependent (later, gated on legal review)

- **Contract/SDS explainer** (highest liability — see AI features doc for the
  hard gates).
- **Candidate shortlisting** against the verified pool (needs density).

---

## Top strategic risks

- **Cost + chicken-and-egg.** High-volume LLM/embedding crons are costly; poster
  matching is worthless until the pool is dense → supply-first sequencing,
  Sonnet + caching + keyword pre-filter.
- **Scraping legality / freshness.** → source attribution + link-back (index,
  not re-publish), dedup, expiry; pursue official feeds/partnerships over time.
- **Thin-content SEO penalty.** Programmatic pages must be **data-backed** (gate
  on real day-rate samples) to avoid a Google demotion.
- See [`ir35-trust-model.md`](./ir35-trust-model.md) for the legal/liability
  risks.
