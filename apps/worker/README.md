# @outside-ir35-jobs/worker

AI aggregation worker. Scrapes already-posted UK contract roles, classifies their
IR35 signal + extracts structured fields with Claude Sonnet, embeds them, and
ingests them as **source-attributed AGGREGATED** jobs. Runs on the shared Hetzner
box (Hono + Bun + systemd), triggered by the web app's daily Vercel cron.

> **The one product rule:** we never assert IR35 status. Scraped jobs default to
> `UNKNOWN`; an outside-leaning signal is only ever the *source's* attributed
> claim (`CLIENT_INTENDS_OUTSIDE`), with confidence surfaced in the UI. We index
> and link back — we do not re-publish job bodies.

## Pipeline (source-agnostic)

scrape → keyword pre-filter → Claude Sonnet classify + extract → OpenAI embed →
upsert by `sourceUrl` (idempotent). `runAggregation(source, scrape, opts)` in
`src/pipeline.ts` is shared; each source is just a `(limit) => ScrapedJob[]`
scraper (`src/scrapers/`).

Sources:

- **Jobserve** — Angular SPA; we capture its `RetrieveJobs` JSON API and parse the
  `.jobItem` fragment deterministically.
- **CWJobs** — server-rendered `job-item` cards carry title/company/location/rate
  (£/hr, £/day, or annual)/snippet inline; we parse the cards deterministically.
  No detail fetch — CWJobs detail pages live on totaljobs.com and are deliberately
  HTTP/2-walled. Hourly rates are converted to day rates (× 7.5h) by the
  classifier; annual salaries are NOT treated as a day rate.
- **Adzuna** — a clean JSON API (no browser): GB `contract_time=contract`. We
  attribute a salary ONLY when Adzuna marks it not-predicted, label it "per year"
  (annual → the classifier leaves dayRate []), and keep `redirect_url` as the
  link-back. Requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` (free at
  developer.adzuna.com); the source skips itself if they're unset.

## Routes

- `GET /health` — `{ status: 'ok' }`.
- `POST /aggregate/jobserve?limit=N` — bearer-gated (`WORKER_SECRET`); kicks off a
  Jobserve run, returns `202` immediately (work runs in the background).
- `POST /aggregate/cwjobs?limit=N` — same, for CWJobs.
- `POST /aggregate/adzuna?limit=N` — same, for Adzuna (no-op if API keys unset).
- `POST /generate/blog?topic=...&dryRun=true` — bearer-gated; generates ONE AI
  blog post (Perplexity research → Claude → honesty validator → Sanity write) and
  returns `202`. No-op if Sanity isn't configured. See `src/blog/`.

## AI blog (`src/blog/`)

Daily cron picks an uncovered topic (`topics.ts`, dedup via Sanity
`generationMeta.topic`) → Perplexity `sonar` research (primary gov.uk/HMRC
sources) → Claude `claude-sonnet-4-6` generation → **honesty validator**
(`validator.ts`, the never-assert-IR35 backstop: forbidden phrases, required
disclaimer, attributed claims, day-rate posts gated on `MIN_SAMPLE`) →
markdown→portable-text → Sanity write. A post failing the validator is REJECTED,
never published. Text-only (no images). Needs `PERPLEXITY_API_KEY` +
`NEXT_PUBLIC_SANITY_*` + `SANITY_API_TOKEN`.

## CV parsing (`src/cv/`)

`POST /process/cv` (bearer-gated; body `{ userId, r2Key, mimeType }`) — fired by
the web upload action when a contractor uploads a CV. Fetches the CV from R2 →
Claude `claude-sonnet-4-6` NATIVE document/image input (no PDF lib/OCR) →
structured profile (`parse-cv.ts`, zod) → OpenAI embed of the competency text →
writes `User.parsedProfile` (Json) + `User.embedding` (raw ::vector). Best-effort.
HONESTY/PII: extracts COMPETENCY only (skills/roles/sectors), deliberately NOT
identity (name/email/address); the profile is the contractor's own stated facts,
never platform-verified and unrelated to IR35 status. Needs `R2_*` + `OPENAI_API_KEY`.

## Local dev

```bash
cp .env.example .env   # fill ANTHROPIC_API_KEY, OPENAI_API_KEY, BROWSERBASE_*, DATABASE_URL
pnpm install           # from repo root
pnpm --filter @outside-ir35-jobs/worker dev          # starts the Hono server
# or run a pipeline once without HTTP:
pnpm --filter @outside-ir35-jobs/worker aggregate:jobserve 10
pnpm --filter @outside-ir35-jobs/worker aggregate:cwjobs 10
pnpm --filter @outside-ir35-jobs/worker aggregate:adzuna 10
```

Without Browserbase creds it falls back to local Playwright (`npx playwright
install chromium` first).

## Deploy (Hetzner, mirrors chunky-crayon)

1. Pull the monorepo to `/opt/outside-ir35-jobs`, `pnpm install` (or `bun install`).
2. Create `apps/worker/.env` from `.env.example`.
3. Copy `deploy/outside-ir35-jobs-worker.service` to `/etc/systemd/system/`,
   then `systemctl daemon-reload && systemctl enable --now outside-ir35-jobs-worker`.
4. Reverse-proxy it (nginx/Caddy) at a stable URL, and set that URL as
   `OUTSIDE_IR35_JOBS_WORKER_URL` (+ the shared `WORKER_SECRET`) on the web app's
   Vercel project, so the daily cron can reach it.
