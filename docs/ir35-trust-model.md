# IR35 Trust Model

> **Read this before writing any IR35-related code or copy.** This is the legal
> and product foundation of the entire platform. Getting it wrong is the single
> biggest liability risk we carry.

This doc is grounded in **current UK off-payroll law as of mid-2026**,
fact-checked against primary sources (gov.uk / HMRC) and recent case law. IR35
content ages fast — re-verify against primary sources before publishing
definitive guidance.

---

## The core principle

**The platform never asserts a legal conclusion about IR35 status.**

It surfaces only two kinds of trust signal:

1. **What the client claims** about a role — attributed to the poster,
   timestamped, with any supporting evidence the client supplies, framed as _the
   client's claim_.
2. **Objectively checkable facts** about a contractor — that their company
   exists, their VAT number is valid, that an insurance document is on file and
   in-date.

We **never** say "verified outside IR35". We say "client states this role is
intended to be outside IR35" and "company & VAT verified against official
registers".

### Why — the two legal pillars

Both are high-confidence and confirmed by multiple sources:

- **(P1) Only the end-client can determine status.** For medium/large
  private-sector clients, the **end-hirer** (not the agency, not the contractor)
  is legally responsible for determining IR35 status and issuing a **Status
  Determination Statement (SDS)** with reasons, taking "reasonable care". The
  platform has _no_ statutory authority to make this determination. (Source:
  gov.uk off-payroll guidance.)

- **(P2) A pure listing platform carries no statutory IR35 tax liability.** HMRC
  tax liability flows to the **fee-payer → deemed employer → client** chain. A
  job board that is _not in the contractual payment chain_ and is _not the
  fee-payer_ carries **no statutory HMRC tax liability**. (Source: FCSA; Osborne
  Clarke.)

The entire model lives in the gap between P1 and P2: **we cannot determine
status (P1), and we are not liable for tax (P2) — but we ARE liable for what we
ASSERT.** So we assert nothing about status; we only surface attributed claims
and checkable facts.

---

## Two separate trust dimensions — never merge them

There are two distinct things being "trusted". Conflating them is the central
trap. Model them as **two independent enums**.

### Dimension 1 — `JobIR35Signal` (about the _role_, set by the poster)

What the _listing_ claims about IR35. Always the **client's** claim, never ours.

```prisma
enum JobIR35Signal {
  CLIENT_INTENDS_OUTSIDE   // "Client states this role is intended to be outside IR35"
  SDS_ISSUED               // Client confirms an SDS has been issued (doc may be attached)
  SMALL_CLIENT_EXEMPT      // Client is "small" → contractor's PSC self-determines (growth area, see below)
  CONTRACT_REVIEW_HELD     // IR35-specialist contract review on file (poster-supplied)
  UNKNOWN                  // aggregated/scraped, status not asserted — FIRST-CLASS DEFAULT
  INSIDE                   // for completeness/filtering; not our niche
}
```

Rules:

- Every outside-leaning listing carries an **attributed string**: _"Client
  states this role is intended to be outside IR35"_ + poster name + timestamp.
- Supporting evidence (SDS PDF, contract-review opinion, CEST result) is shown
  as **"evidence provided by the client"** — never as platform verification.
- A **CEST screenshot is explicitly flagged as not determinative** (see CEST
  note below).
- For **aggregated/scraped** jobs, the AI classifier maps to this enum, but
  `UNKNOWN` is **first-class** and must be the default when confidence is low.
  Classifier confidence is surfaced in the UI.

### Dimension 2 — `ContractorTrustTier` (about the _contractor_, earned over time)

The start-light tiered ladder. Each tier means a _specific, defensible_ set of
checks — never a status guarantee.

```prisma
enum ContractorTrustTier {
  SELF_DECLARED        // T0 — launch default, free
  IDENTITY_VERIFIED    // T1 — Companies House + VAT (VIES/HMRC) auto-checks pass
  DOCUMENTS_ON_FILE    // T2 — PI/PL/EL certs uploaded, insurer + limit + expiry tracked
  COMPLIANCE_CURRENT   // T3 — all docs present AND in-date AND right-to-work confirmed
}
```

Plus an **orthogonal boolean badge** — the _safest_ trust signal of all, because
it's a fact we can check rather than a status we'd be asserting:

```prisma
holdsIR35Insurance  Boolean  @default(false)  // + provider + expiry
```

**What each contractor tier means, and the exact copy contract:**

| Tier                      | What we actually checked                                                                            | Badge copy (the contract — do not exceed it)                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **T0 SELF_DECLARED**      | Nothing — contractor typed it. Free.                                                                | _"Self-declared — not yet verified."_                               |
| **T1 IDENTITY_VERIFIED**  | Company number against the free **Companies House API**; VAT number against **HMRC VAT v2 / VIES**. | _"Company & VAT verified against official registers (DD/MM/YYYY)."_ |
| **T2 DOCUMENTS_ON_FILE**  | PI/PL/EL certs uploaded to R2; insurer, cover limit, **expiry** parsed and stored.                  | _"Insurance documents on file — PI £Xm, expires DD/MM/YYYY."_       |
| **T3 COMPLIANCE_CURRENT** | Everything in T2 **in date**, plus right-to-work on file and current.                               | _"Compliance pack complete and current."_                           |

- T1 verifies **existence/active status only** — not trading legitimacy. Word it
  that way.
- T2/T3 say "document on file, expires DD/MM/YYYY" — **never** "insurance
  verified" or "authentic" beyond what we actually checked.
- Renewal reminders fire before expiry; a lapsed doc **auto-downgrades T3 →
  T2**.

---

## Non-negotiable wording rules

Apply everywhere — listings, profiles, signup, marketing, blog, mobile:

- **Banned as platform assertions:** "verified outside IR35", "guaranteed
  outside IR35", "IR35-compliant".
- **Required disclaimer** on every outside-leaning listing and at signup: _the
  platform does not determine, verify, or warrant IR35 status; the SDS is the
  client's legal responsibility; contractors should take their own advice and
  consider IR35 insurance._
- Where a regulator is named, cite the **Fair Work Agency (FWA)** — **not** the
  abolished EASI (see below).
- Clients accept terms **warranting** their stated IR35 intention and
  **indemnifying** the platform.
- The safe, factual signals to prefer: _"client has issued an SDS"_,
  _"IR35-specialist contract review held"_, _"contractor holds active IR35 /
  tax-investigation insurance"_.

---

## Current IR35 law cheat-sheet (mid-2026)

Maintained living reference. **These facts drift — re-check primary sources
before publishing guidance.** Confidence is high unless noted.

1. **Reform is in force.** The April 2021 private-sector off-payroll reform
   remains in force in 2026. (The Sept 2022 "repeal" was reversed within weeks.)
   Chapter 10 ITEPA still applies.

2. **Client determines status + issues SDS** for medium/large clients (P1
   above).

3. **Small clients are exempt** — the contractor's PSC self-determines. From **6
   April 2026** the "small" thresholds rose (turnover £10.2m → **£15m**, balance
   sheet £5.1m → **£7.5m**, headcount unchanged at 50; meet 2 of 3). _Date
   nuance:_ this derives from the Companies Act uplift for financial years
   beginning on/after 6 April 2025, applied to IR35 via the prior-financial-year
   size test — so "6 April 2026" is right _for IR35_, but don't conflate the two
   dates. **Market signal:** a _growing_ share of genuinely outside-IR35 work
   will be **self-determined** → this is `SMALL_CLIENT_EXEMPT`, a real growth
   segment for us.

4. **April 2024 set-off fixed most "double taxation".** HMRC can now offset
   income tax, employee NICs and corporation tax already paid by the worker/PSC
   against a deemed- employer assessment. **Employer NICs and the Apprenticeship
   Levy are NOT offset.** Effect: extra exposure dropped from ~5× the true
   liability to roughly ~10–15% on top of fees. **These figures are illustrative
   commentary, not statutory — label them as approximate.** This is _why clients
   are more willing to engage outside IR35 again_ — a legitimate selling point.

5. **Liability flows to the fee-payer/client, not a job board** (P2 above).
   _Nuance:_ even where the client took reasonable care, HMRC has a supply-chain
   debt-transfer power that can reach the end-client if the fee-payer is
   insolvent. None of this attaches to a non-contracting board — but don't tell
   clients "outside IR35 is now risk-free".

6. **The three status tests:** genuine/**exercisable substitution**, **lack of
   control**, and **mutuality of obligation (MOO)**. Courts assess the written
   contract _and_ actual working practices together. **MOO is now a weak
   shield** — the leading authority is **HMRC v PGMOL (Supreme Court,
   Sept 2024)**, which HMRC won and which set a _low_ MOO bar (alongside _Atholl
   House_, 2022). **Lead any status reasoning on substitution + control, not "no
   MOO".**

7. **CEST is not verification.** HMRC's CEST tool was updated ~April 2025 but
   still doesn't properly test MOO and assumes it exists. HMRC stands behind a
   CEST result only if the inputs accurately reflect reality. **A CEST
   screenshot is never "verification".**

8. **IR35 insurance is the safe trust signal.** Products like Qdos TLC35 / Legal
   Protection and Markel Tax cover tax/NIC/penalties and enquiry representation.
   "Holds active IR35 / tax-investigation cover" is **far safer to display**
   than "verified outside IR35", and is an affiliate revenue opportunity.

9. **EASI is abolished → Fair Work Agency (FWA).** From **7 April 2026** the
   Employment Agency Standards Inspectorate's functions transferred to the new
   **FWA** under the Employment Rights Act 2025 (consolidating EASI, GLAA and
   HMRC NMW enforcement). **Cite the FWA, never EASI** — getting this wrong on a
   compliance-selling platform is self-undermining.

10. **Conduct Regs probably don't bind a pure job board.** The Conduct of
    Employment Agencies and Employment Businesses Regulations 2003 only bind
    entities acting as an _employment agency / employment business_. Per _Simply
    Learning Tutor Agency Ltd v SoS_ (2020), a genuinely pure classified-ad /
    introducer platform can fall **entirely outside** them — leaving only
    general misrepresentation / consumer-protection / ASA exposure. **Corollary
    (load-bearing):** the moment we add **matching, introductions, vetting, or
    payment handling**, we may re-enter scope and even become a **"fee-payer"**
    in the tax chain. **Our operating model determines our liability.** Take
    specialist legal advice before moving beyond classified ads.

11. **April 2026 umbrella J&S liability.** From **6 April 2026**, new rules
    (Finance Bill 2025-26, new Chapter 11 ITEPA 2003) make agencies and
    sometimes end-clients **jointly and severally liable** for an umbrella's
    unpaid PAYE/NIC — **concurrently from the outset** (HMRC assesses the
    umbrella first, but the agency/end-client is concurrently liable), not
    transfer-only-on-failure. HMRC estimates ~£2.8bn saved by 2030. **Market
    signal:** this raises the cost/risk of umbrella routes and pushes demand
    toward genuine outside-IR35 PSC work — our exact niche. Still in-flight
    legislation: treat as effective 6 Apr 2026 but re-check the final enacted
    Act.

---

## The contractor compliance pack (the moat)

Limited-company contractors repeatedly supply the same documents to every
agency/client. This repetition is the product opportunity — let them do it
**once**, verify the checkable parts, share in one click. Typical items (with
expiry/renewal tracking, not one-time upload):

- Certificate of **incorporation** / company number → auto-verify (Companies
  House API)
- **VAT** registration number/certificate → auto-verify (HMRC VAT v2 / VIES)
- **Professional Indemnity** (often £1m+, ~£300–400/yr), **Public Liability**,
  and **Employers' Liability** (if they have staff) certificates → R2 upload +
  expiry tracking
- **Right-to-work** evidence → refresh at least annually on long engagements
- **CV**, **day rate**, **references**, **bank details**

> Right-to-work, VAT status and insurance currency genuinely need periodic
> re-checking, so the profile feature needs **expiry/renewal tracking**, not
> just one-time upload.

---

## Top trust-model risks

1. **Status-assertion liability (highest live risk).** Any "verified/guaranteed
   outside IR35" badge is legally unfounded and invites negligent-misstatement /
   misrepresentation claims. → Mitigated by this entire model: attributed
   claims + checkable facts only, disclaimers everywhere, client warranty +
   indemnity.
2. **Stale regulatory copy (credibility).** Referencing EASI (now FWA) on a
   compliance platform undermines us. → Treat the KB as a maintained living
   asset.
3. **Regulatory creep / reclassification.**
   Matching/vetting/introductions/payments could make us an employment business
   or fee-payer. → Stay a pure index + SaaS; legal review before any move into
   matching/payments.
4. **Classifier accuracy.** F1 ~65–75% means inside-as-outside errors damage
   trust. → First-class `UNKNOWN`, visible confidence, human spot-checks,
   permanent eval set.
5. **PII / GDPR.** Parsed CVs, bank details, verification docs in R2/Postgres. →
   Access controls, retention limits, care sending PII to third-party
   LLM/embedding providers; verify only what gov APIs genuinely confirm.

---

## Schema implications

Land these forward-looking fields in the **initial migration** so later phases
don't need migrations against a busy production DB. See
[`monorepo-migration.md`](./monorepo-migration.md) for the data-safety
baselining step (critical — there are currently no migrations).

- **Job:** `ir35Signal` (`JobIR35Signal`), `classificationConfidence`,
  `source` + `sourceUrl`, `rawDescription`, `extractedSkills`, `embedding`
  (pgvector). _Replace the current `verifiedIR35Status Boolean` — it's exactly
  the assertion we must never make._
- **Contractor/seeker:** `trustTier` (`ContractorTrustTier`),
  `holdsIR35Insurance` + provider + expiry, `parsedProfile`, `embeddings`.
- **Documents:** insurer / cover-limit / **expiry** fields with renewal
  tracking + R2 keys.
- **Enable `pgvector` on Neon now** (cheap now, blocks matching later if
  deferred).
