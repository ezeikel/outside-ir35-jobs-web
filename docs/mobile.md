# Mobile app (`apps/outside-ir35-jobs-mobile`)

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
| `GET  /api/mobile/jobs/[id]`   | `getJob(id)` (gated on boardVisible+isActive) → detail    | public |

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
apps/outside-ir35-jobs-mobile/
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

## Not done yet (next phases)

- `eas init` to create the Expo project, then set `updates.url` +
  `extra.eas.projectId` in `app.config.ts`.
- Real app icons / splash (current ones are generated placeholders).
- Fonts (Inter Tight / Instrument Serif / Geist Mono) — `global.css` names the
  families; drop the `.ttf`s into `assets/fonts` + register via `expo-font`.
- Authed surfaces: in-app apply (verified profile), saved searches + alerts,
  premium (RevenueCat or Stripe), onboarding role picker.
- Day-rates benchmark screen + `/api/mobile/day-rates` (honesty-gated on sample
  size, like the web).
- Push notifications (FCM + notifee, as in go-unbeaten) for job alerts.
