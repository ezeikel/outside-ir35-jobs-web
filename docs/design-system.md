# Design System — Register

The visual language for outsideir35.jobs. **Editorial-premium fintech**: ink
authority anchor, forest-green reserved for verified states, attributed claims
rendered as citations. Two type faces, hard cap. Live showcase at **`/design`**.

> Chosen over two alternatives (Atelier = warmer/Airbnb-leaning; Ledger =
> denser/Linear-Mercury). Register is the editorial-premium middle — it resolves
> the Airbnb-vs-LinkedIn tension instead of picking a side, and the serif-typeset
> attributed claims turn the legal constraint ("never assert IR35 status") into
> the brand's most distinctive asset. It degrades cleanly to Ledger by swapping
> the display face → Geist, with no re-tokening.

## Principles

1. **Ink is the authority anchor — never "Stripe blue".** The primary is a warm
   anthracite (`--ink-950`, ≈ `#17181A`). Blue appears only as a quiet secondary
   link tint (`--link`), deliberately not the brand, to escape the SaaS blue
   sea-of-sameness.
2. **Green is earned, never implied.** `--verified` (forest-green `#1F5D43`) is
   used *only* for states we actually verified against an official register, or
   register-verified trust tiers (T1+). T0 self-declared is neutral grey.
3. **Amber for aging, red only for failed.** `--aging` flags
   expiring/partial/pending. `--destructive` is reserved for genuine failure.
4. **Honesty looks like editorial integrity.** Verified facts render as cited
   rows (source + status + date). Client claims render as attributed pull-quotes
   with **no** green tick. The two are always visually separated. This is the
   most important rule — see [`ir35-trust-model.md`](./ir35-trust-model.md).
5. **Serif is for headline moments only.** Instrument Serif never appears in
   dense tables or at small sizes — Inter Tight does all the working text and
   data. All money/percentile/date figures use `tabular` (lining tabular nums).

## Tokens — `apps/web/global.css`

Authored as Tailwind 4 `@theme` + OKLCH primitives in `:root` / `.dark`.

| Token | Role |
|-------|------|
| `--ink-50 … --ink-950` | Neutral ink ramp (slightly warm). `--ink-950` = authority anchor. |
| `--background` / `--card` | Neutral off-white canvas (`#F6F5F3`) / white card surface. |
| `--primary` | = ink-950 (authority anchor). |
| `--verified` / `-foreground` / `-muted` | Forest-green; verified states ONLY. |
| `--aging` / `-foreground` / `-muted` | Amber; expiring/partial/pending. |
| `--link` | Quiet ink-blue; secondary links/CTA tint only. |
| `--destructive` | Failed states only. |
| `--radius` | `0.5rem` base; `sm/md/lg/xl` derived. |

Tailwind utilities exposed: `text-verified`, `bg-verified-muted`, `text-aging`,
`text-link`, `text-ink-700`, `border-verified/25`, etc., plus the `.tabular`
class for tabular lining numerals.

## Typography — `apps/web/app/layout.tsx`

| Face | Var | Use |
|------|-----|-----|
| **Instrument Serif** (400) | `--font-instrument-serif` → `font-display` | Display headings, page titles, day-rate hero, job-detail headers. `h1/h2/h3` get it by default. |
| **Inter Tight** | `--font-inter-tight` → `font-sans` | Body, all UI, data, dense lists. The workhorse. |
| **Geist Mono** | `--font-geist-mono` → `font-mono` | Optional, where a mono figure reads better than tabular sans. |

## Components — `apps/web/components/trust/`

The 8 direction-agnostic primitives (the verification moat). Import from
`@/components/trust`.

| Component | Purpose |
|-----------|---------|
| `VerifiedBadge` | Single billboard trust mark (shield). `verified` / `partial` / `unverified`. Links to the verification page; not a sticker. |
| `VerifiedFactRow` | An objectively checkable fact as a citation: `Companies House — active · verified 11 Jun 2026`. Green tick only when actually verified. |
| `AttributedClaim` | The **client's** claim as a pull-quote — attributed, timestamped, **no green tick**. Visually separated from verified facts. The single most important trust component. |
| `TrustTierBar` | Contractor trust ladder T0→T3 (Uxcel segmented model). Green ticks only on register-verified tiers. |
| `JobMeta` | `DayRatePill` (right-aligned, tabular), `IR35SignalChip` (the client's claim — only SDS/contract-reviewed variants carry weight), `WorkModePill`, `ContractLengthPill`. |
| `CompletenessRing` | Peerlist-style profile-completeness ring. |
| `DocStatusRow` | Per-document live status with honest copy ("on file, expires DD/MM/YYYY"). |
| `JobListCard` | Core job-board surface. List-leaning, comparison-ready. Title in Inter Tight (serif is for the detail page, not the dense list). |

## What's next (the theme layer — ~20%)

The spine above is direction-agnostic. Applying Register fully across the real
app is the remaining work: re-skin the existing pages (home, `/jobs`,
`/job/[id]`, `/job/post`) and the shadcn `ui/*` components onto these tokens,
build the job-detail "editorial essay" treatment, and the day-rate benchmark
metric strip. To pivot warmer (Atelier) or denser (Ledger) later, change ~5
tokens (display face + radius + exact palette warmth) — the component contracts
don't change.
