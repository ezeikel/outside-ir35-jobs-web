# AI Feature Roadmap

The moat is a **UK-IR35 reasoning layer** plus a **verified-contractor identity
graph** that LinkedIn and Indeed lack. AI runs the same way as the sister
project `chunky-crayon`: Claude (+ Perplexity for research) on **cron**, in a
dedicated **worker app**.

Prioritised into **launch / fast-follow / later**. Effort: S / M / L.

---

## LAUNCH — the data + trust moat (these reinforce each other)

Classification makes data → data powers benchmarking → verification makes the
identity moat. Ship these together.

### 1. IR35 classifier + structured extraction — `M`

The wedge. Cron + **Claude Sonnet** (not Opus — cron cost) with a strict JSON
schema:

- Classify `JobIR35Signal`: outside / inside / **unknown** — **`UNKNOWN` is
  first-class** and the default when confidence is low.
- Extract structured fields from messy descriptions: day rate, work mode,
  contract length, location, key skills.
- **Hybrid** keyword pre-filter + LLM (cost + accuracy).
- Expect **F1 ~65–75%** → **surface confidence in the UI**, do human
  spot-checks, and keep a **labelled eval set as a permanent asset**.

### 2. Verification triage — `M`

Under-rated moat: the deterministic half is **free via gov APIs**.

- **Companies House API** (free) — verify company number / active status.
- **HMRC VAT API v2** (OAuth; **v1 removed Feb 2025**) / VIES — verify VAT
  number.
- **Claude vision** reads R2-uploaded docs (incorporation, insurance, VAT
  certs), reconciles against API truth, and **flags mismatches / expired
  insurance / dissolved companies for fast human sign-off**.
- This is what makes a "verified contractor" hard to fake. Word claims to match
  exactly what was checked (see [`ir35-trust-model.md`](./ir35-trust-model.md)).

### 3. Day-rate benchmarking — `S`

Near-free byproduct of extraction. Aggregate rates by skill / role / seniority /
region / mode; **segment by IR35 status** (inside roles run ~15–25% higher
gross). **Gate on sample size**; sanity-check against IT Jobs Watch /
ContractorUK. Powers SEO + a free contractor magnet.

---

## FAST-FOLLOW — once embeddings + verified profiles exist

### 4. CV parsing → structured profile + multi-aspect embeddings — `S–M`

Claude parses CVs into a structured profile and **separate** skills / experience
embeddings. Use a cheaper embedding model (e.g. `text-embedding-3-small`) for
cost.

### 5. Semantic matching (pgvector) — `M`

**pgvector HNSW** + **hard filters** (outside-only, rate floor, mode, location).
Hybrid search (semantic + keyword). This is the core seeker UX. Requires
`pgvector` enabled on Neon **early** (Phase 0).

### 6. AI alerts + one-click pitch tailoring — `S–M`

- **Alerts:** match listings to a contractor's profile + rate floor, with a
  **"why-matched"** explanation.
- **Tailoring:** draft a contractor pitch / cover note from CV + listing,
  **constrained to real facts** (no hallucinated experience). Reuses
  embeddings + react-email.

### 7. AI blog + programmatic SEO — `M`

The **chunky-crayon pattern**: Claude + **Perplexity** on cron generating an
outside-IR35 blog, programmatic pages, and **first-party day-rate / market-trend
reports**. **Data-backed only** — gate on real day-rate samples to avoid
thin-content penalties. Partly reusable from chunky-crayon's worker.

---

## LATER — higher risk or pool-dependent

### 8. Job-spec writer for posters — `S` (low risk, could move earlier)

AI assist for writing job specs (improves the existing TipTap editor). Safe,
shippable.

### 9. Candidate shortlisting — `M` (needs a dense verified pool)

Match/rank the verified-contractor pool against a posted role.
Pool-density-dependent.

### 10. Contract / SDS risk explainer — `M–L` (HIGHEST LIABILITY — deferred)

Claude reads an uploaded contract/SDS (from R2) and flags control / substitution
/ MOO red flags and paper-only-vs-exercisable clauses.

**Hard gates before this ships:**

- Legal review of disclaimers + UX.
- A **maintained KB** current with **PGMOL (2024)** and the **April 2026**
  changes.
- **Hard rule: never output a binary IR35 verdict** — always indicative-only,
  always cite HMRC CEST + recommend a solicitor.
- **Lead reasoning on genuine substitution + lack of control, not "no MOO"**
  (PGMOL set a low MOO bar). See the trust model.

---

## Cross-cutting AI rules

- **Cost:** Sonnet (not Opus) + **prompt caching** + **keyword pre-filter** for
  high-volume crons.
- **Eval:** keep a **permanent labelled eval set**; measure before trusting
  changes.
- **UI honesty:** **surface confidence** before trusting any AI output in the
  UI; `UNKNOWN`/low-confidence must be visible, never silently coerced to
  "outside".
- **The IR35 KB is a living asset** — the EASI→FWA and PGMOL drift proves how
  fast it ages. Re-check primary sources.
- **PII:** be careful sending CVs / bank details / verification docs to
  third-party LLM / embedding providers; access controls + retention limits.

---

## Schema fields these features need (land early)

In the initial migration (avoids migrations against a busy DB later):

- **Job:** `ir35Signal` enum, `classificationConfidence`, `source` +
  `sourceUrl`, `rawDescription`, `extractedSkills`, `embedding` (pgvector).
- **Seeker:** `parsedProfile`, `embeddings`, `trustTier`, `holdsIR35Insurance`
  (+ provider, expiry).
- **Enable `pgvector` on Neon now.**

See [`ir35-trust-model.md`](./ir35-trust-model.md) and
[`monorepo-migration.md`](./monorepo-migration.md).
