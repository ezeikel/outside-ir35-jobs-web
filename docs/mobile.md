# Mobile app (`apps/mobile`)

> React Native / Expo app for outsideir35.jobs. Scaffolded to match the
> conventions of the sibling Chewy Bytes apps (chunky-crayon, go-unbeaten):
> Expo SDK 56, expo-router, NativeWind 5, TanStack Query, native Google/Apple
> sign-in. This doc is the operating manual for the mobile track.

## The one product rule still applies

Everything in [`ir35-trust-model.md`](./ir35-trust-model.md) holds on mobile.
The app **never asserts IR35 status** — it surfaces only the client's attributed
position (`ir35Claim`, always with `attributedTo` + `statedAt`) and objectively
checkable facts. The IR35 label mapping in `lib/mobile/job-dto.ts` mirrors the
web's `components/trust/JobMeta.tsx` exactly; keep them in sync.

## Why a thin HTTP layer, not shared code

The web app's rule is "server actions are the source of truth; routes wrap
them." RN can only call HTTP, so the mobile app talks to **`/api/mobile/*`**
routes on the web app, each a thin wrapper over an existing server action. This
is what keeps web + mobile on one implementation — a board filter or an IR35
rule can't drift between them because both go through the same action.

### Routes added for mobile (in `apps/web`)

| Route                          | Wraps / does                                              | Auth   |
| ------------------------------ | -------------------------------------------------------- | ------ |
| `POST /api/mobile/auth/google` | verify Google idToken → upsert user → mint session token | public |
| `POST /api/mobile/auth/apple`  | verify Apple identityToken (JWKS) → upsert → mint token   | public |
| `GET  /api/mobile/auth/me`     | resolve bearer token → current user                      | bearer |
| `GET  /api/mobile/jobs`        | `searchJobs(params)` → mobile card DTOs                   | public |
| `GET  /api/mobile/jobs/[id]`   | `getJob` (gated) → detail + the caller's apply eligibility | mixed  |
| `POST /api/mobile/onboarding`  | pick role (setUserRole logic) → updated user             | bearer |
| `POST /api/mobile/applications`| apply to a job (shared `canApply` gate)                  | bearer |
| `GET/POST /api/mobile/saved-searches` | list / save (FREE_SAVED_SEARCH_LIMIT + premium gate) | bearer |
| `DELETE/PATCH /api/mobile/saved-searches/[id]` | delete / toggle alerts (owner-scoped) | bearer |
| `GET  /api/mobile/profile`     | `getContractorProfile` data → verified-pack DTO          | bearer |
| `POST /api/mobile/documents`   | multipart upload → `uploadDocumentForUser` (R2 + recompute) | bearer |
| `DELETE /api/mobile/documents/[type]` | remove a doc → `deleteDocumentForUser`            | bearer |
| `GET  /api/mobile/premium`     | authoritative premium state (isPremium) from the DB      | bearer |
| `GET  /api/mobile/day-rates`   | `getDayRateBenchmarks` (MIN_SAMPLE-gated in SQL) → DTO    | public |
| `POST /api/webhooks/revenuecat`| RevenueCat events → upsert Subscription (provider=REVENUECAT) | shared-secret |

The authed routes resolve the caller via `getMobileCaller(req)` and reuse the
SAME business primitives as the web actions (`canApply`, `isPremium`,
`toStoredSearch`, `OnboardingRoleSchema`) — so rules can't drift between
surfaces. `/api/mobile/jobs/[id]` is "mixed": public detail, plus per-viewer
apply eligibility when a bearer token is present.

Supporting libs live in `apps/web/lib/mobile/`:

- `oauth.ts` — verify Google (`google-auth-library`) + Apple (`jose` JWKS)
  tokens; `upsertUserForIdentity` (same find-or-create as the NextAuth `signIn`
  callback — first sign-in creates a provisional user with `role=null`).
- `session.ts` — mint/verify the **mobile session token**: a JWT (HS256, signed
  with `AUTH_SECRET`, 90-day TTL, aud `outsideir35.jobs/mobile`). Separate from
  the NextAuth cookie so the two surfaces don't interfere.
- `auth.ts` — `getMobileCaller(req)`: the mobile equivalent of `auth()`. Every
  authed `/api/mobile/*` route calls it; re-reads role/onboarded from the DB.
- `job-dto.ts` — DB row → plain-JSON DTO the RN app renders (the app can't
  import web components or server types).

## Auth flow (native Google + Apple)

1. App calls the native SDK: `@react-native-google-signin/google-signin` or
   `expo-apple-authentication` → gets an `idToken` / `identityToken`.
2. POSTs it to `/api/mobile/auth/{google,apple}`; server verifies + upserts +
   mints the session token, returns `{ sessionToken, user }`.
3. App stores the token in **expo-secure-store** (Keychain / Android encrypted
   prefs) via `lib/auth.ts`; the axios interceptor (`lib/api.ts`) attaches it as
   `Authorization: Bearer …` on every request.
4. On cold start the app validates the stored token against `/api/mobile/auth/me`
   (`contexts/AuthContext.tsx` → `refreshAuth`).

Browsing the board + day-rates is **public** (no token). Applying, saved
searches, and premium require a session (next phase).

## App structure

```
apps/mobile/
  app/                      expo-router screens (typed routes)
    _layout.tsx             Stack + Providers + global.css
    (tabs)/_layout.tsx      Jobs / Day rates / Profile
    (tabs)/index.tsx        the board (FlashList + TanStack Query)
    (tabs)/day-rates.tsx    benchmark (placeholder — next phase)
    (tabs)/profile.tsx      sign-in (Google + Apple) / account
    job/[id].tsx            listing detail + apply control
  components/               JobCard, …
  contexts/AuthContext.tsx  app-wide auth (useAuth)
  lib/                      api (axios), auth (secure-store), api-auth, api-jobs, format
  providers.tsx             QueryClient + PostHog + Auth + Toaster + gesture/safe-area
  global.css                NativeWind @theme — tokens mirrored from web (hex)
  app.config.ts             per-env identity (com.chewybytes.outsideir35.app[.dev|.internal])
  eas.json                  dev / preview / production build profiles
```

Styling: NativeWind 5 (Tailwind classes), tokens in `global.css` mirrored from
the web's design system (OKLCH → hex). Same brand, not a new one.

## Env vars (set before a real build)

`EXPO_PUBLIC_*` (client-public, per EAS profile):

- `EXPO_PUBLIC_ENVIRONMENT` — development | preview | production (set by eas.json)
- `EXPO_PUBLIC_API_URL` — backend base URL (defaults: prod site, or
  127.0.0.1:3000 / 10.0.2.2:3000 in `__DEV__`)
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST` (optional)

Server-side (on the web app's Vercel project) for token verification:

- `GOOGLE_MOBILE_WEB_CLIENT_ID` / `GOOGLE_MOBILE_IOS_CLIENT_ID` /
  `GOOGLE_MOBILE_ANDROID_CLIENT_ID` — accepted Google idToken audiences
  (falls back to the existing `GOOGLE_CLIENT_ID`).
- `APPLE_BUNDLE_IDS` — comma-separated accepted Apple audiences (defaults to
  `com.chewybytes.outsideir35.app`).
- `AUTH_SECRET` — already set; also signs the mobile session JWT.

## Done (authed surfaces)

- Onboarding — a swipeable carousel (3 value-prop slides → role picker), gated at
  the root (a signed-in user with no role is sent to `/onboarding`).
- In-app apply on the job detail (cover note + the server-computed eligibility:
  apply / already-applied / sign-in / link-out).
- Saved searches: "Save this search" on the board (contractor-only) + an Alerts
  tab to pause/resume/delete.
- Verified-profile surface on the Profile tab for contractors: `GET
  /api/mobile/profile` → trust tier, register-checked companies (attributed +
  dated), compliance-pack documents with expiry status, IR35 insurance,
  right-to-work.
- In-app document upload: pick a PDF (expo-document-picker) or photo
  (expo-image-picker), client-validated against the server allow-list (PDF/PNG/
  JPEG/WebP, 10 MB), POSTed multipart to `/api/mobile/documents` which wraps the
  shared `uploadDocumentForUser` core (R2 put + upsert + CV-parse trigger + RTW
  flag + trust-tier recompute). Per-doc-type rows with add/replace/remove; expiry
  + insurer/cover collected for insurance/RTW. Company verification + IR35-
  insurance editing still live on web.

## EAS

The EAS project exists: **`@chewybytes/outside-ir35-jobs`** (id
`41f0c985-1efb-4743-9cc6-f0185e430044`), wired into `app.config.ts`
(`extra.eas.projectId` + `updates.url`). `eas build` / `update` / `submit` are
unblocked. A real device build still needs the per-build env (Google/RevenueCat
keys) set in the EAS environment, and credentials (signing) on first build.

## Not done yet (next phases)

- Real app icons / splash (current ones are generated placeholders).
- Fonts (Inter Tight / Instrument Serif / Geist Mono) — `global.css` names the
  families; drop the `.ttf`s into `assets/fonts` + register via `expo-font`.
- Push notifications (FCM + notifee, as in go-unbeaten) for job alerts.

The **day-rates** tab is done: the screen wraps `GET /api/mobile/day-rates`
(which wraps `getDayRateBenchmarks()`, already `MIN_SAMPLE`-gated in SQL), with
the same header + honesty disclaimer + gated empty-state copy as the web page.
INSIDE jobs are counted on purpose (the inside-vs-outside rate gap is the point);
the gate means a rate only shows once ≥ MIN_SAMPLE (5) listings back it.

## Premium (mobile = RevenueCat, web = Stripe)

App/Play store rules forbid Stripe for in-app digital subscriptions, so mobile
premium uses **StoreKit / Play Billing via RevenueCat**, while web stays on
Stripe. Both write the SAME `Subscription` row (one per user, `provider`
discriminator), and `isPremium()` reads only `{ status, currentPeriodEnd }` — so
a sub from either channel unlocks every gate identically (incl. the mobile
saved-searches route), and a web subscriber is recognised as premium on mobile.

- `POST /api/webhooks/revenuecat` (the mobile source of truth) verifies a shared
  secret (`REVENUECAT_WEBHOOK_AUTH`), maps the RC event → Stripe-style status +
  period (`lib/mobile/revenuecat.ts`, unit-tested), and upserts the row by
  `app_user_id` (= the DB user id, because the app configures RC with
  `appUserID=userId`).
- The app reads premium from `GET /api/mobile/premium` (the **authoritative**
  DB state — NOT the RC client SDK), via `usePremium()`.
- `lib/revenuecat.ts` configures RC (anchored to the user id), exposes offering /
  purchase / restore, and fails loud if a non-dev build uses a `test_` key. The
  Paywall + Premium tab mirror the web `/premium` copy; the saved-search limit
  (402) routes free contractors to the paywall.

**Env needed before it's live** (built but inert until provisioned — like web
premium): `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY` (client), a RC
project with an offering + the `premium` entitlement + App Store/Play
subscription products, and `REVENUECAT_WEBHOOK_AUTH` on the web app's Vercel
project (matched to the RC dashboard webhook auth header). outsideir35.jobs is
not yet in the `store` CLI, so the RC project isn't provisioned.
