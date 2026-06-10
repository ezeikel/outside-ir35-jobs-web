# Biome migration — fleet rollout recipe

This repo (`outside-ir35-jobs`) switched from ESLint + Prettier to **Biome** for
linting and formatting. This doc is the recipe to apply the same switch to the
other projects (**chunky-crayon**, **ptp**) so the fleet stays consistent.

**Why Biome:** ~10–340× faster (lints ~56 files in ~20ms vs ESLint's ~6.4s), one
config file + one dependency instead of the ~16-package ESLint flat-config stack
(`eslint-config-airbnb-extended`, `@stylistic`, `typescript-eslint`,
`eslint-plugin-import-x`, prettier plugins…) that kept hitting pnpm
version-resolution conflicts. Biome's recommended set overlaps heavily with the
useful airbnb rules; the dogmatic stylistic ones are handled by Biome's formatter.

**Note on airbnb:** there is no first-class airbnb preset for Biome, and airbnb's
ESLint config still hasn't shipped ESLint 9 support (as of mid-2026). We carry
airbnb rules across with `biome migrate eslint --include-inspired` — a
faithful-spirit port, not byte-identical (Biome deviates slightly / skips some
rule options).

---

## Per-repo steps

**One `biome.json` at the repo root** — NOT per-app. Biome 2.x treats the repo
(via `.git`) as the workspace root, so an app-level `biome.json` is read as a
second "nested root configuration" and **fails** (`Found a nested root
configuration, but there's already a root configuration`) — which breaks the
lint-staged hook that runs from root. A single root config also covers
`packages/*`. (If you ever genuinely need a nested config, it must set
`"root": false` — but for these repos, one root config is simplest and correct.)

Migrate from the existing ESLint config first (Biome reads it as the source), so
do this **before** deleting the ESLint files. The `migrate` command reads the
nearest ESLint config; run it from the app that has one, then move the result to
the repo root.

```bash
# 1. From an app that has eslint config: init + migrate (carries airbnb-inspired rules)
cd apps/<app>
npx @biomejs/biome init
npx @biomejs/biome migrate eslint --include-inspired --write

# 2. Move the generated config to the REPO ROOT (single workspace config)
cd ../..                       # repo root
git mv apps/<app>/biome.json biome.json

# 3. Apply the tuning below (formatter, css, relaxed rules, overrides). The
#    files.includes / overrides already use **/ globs so they work repo-wide.

# 4. Fix findings from the repo root: auto-fix safe ones, then green-check
npx @biomejs/biome check --write .
npx @biomejs/biome check .          # should be green (warnings ok)
```

### biome.json tuning (apply after `migrate`)

The migration defaults the formatter to **tabs + double quotes** — override to
match the existing Prettier config. And it leaves Biome's stricter style rules on,
which churn vendored/shadcn code. Apply:

1. **Formatter → match `.prettierrc`** (these projects all use 2-space / single
   quote / semi / trailing-all / width 80):
   ```json
   "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 80 },
   "javascript": { "formatter": {
     "quoteStyle": "single", "jsxQuoteStyle": "double",
     "trailingCommas": "all", "semicolons": "always", "quoteProperties": "asNeeded"
   }}
   ```

2. **Tailwind 4 CSS at-rules** (`@plugin`, `@custom-variant`, `@theme`, `@source`)
   — Biome's CSS parser rejects these by default:
   ```json
   "css": { "parser": { "tailwindDirectives": true } }
   ```

3. **Monorepo ignores**:
   ```json
   "files": { "ignoreUnknown": true, "includes": [
     "**", "!**/.next", "!**/node_modules", "!**/coverage",
     "!**/dist", "!**/.turbo", "!**/src/generated", "!next-env.d.ts"
   ]}
   ```

4. **Relax over-strict style rules** to the prior strictness (these weren't errors
   under airbnb-ESLint; leaving them on churns vendored code):
   ```json
   "linter": { "rules": { "style": {
     "noNestedTernary": "off", "useNamingConvention": "off",
     "useDefaultSwitchClause": "off", "noParameterAssign": "off",
     "noImplicitBoolean": "off", "useBlockStatements": "off"
   }}}
   ```

5. **`noConsole`** — match the old `no-console: [2, {allow:['warn','error']}]`:
   ```json
   "suspicious": { "noConsole": { "level": "error", "options": { "allow": ["warn", "error", "info"] } } }
   ```

6. **Overrides** — relax shadcn `ui/` + config files:
   ```json
   "overrides": [
     { "includes": ["**/components/ui/**"], "linter": { "rules": {
       "style": { "useImportType": "off" }, "suspicious": { "noExplicitAny": "off" } } } },
     { "includes": ["**/*.config.{js,mjs,ts,mts}", "**/vitest.config.mts"],
       "linter": { "rules": { "suspicious": { "noConsole": "off" } } } }
   ]
   ```

### package.json — scripts (per app)

Per-app `biome` scripts still work — `biome` searches upward and finds the single
root `biome.json`, so `biome lint .` from an app dir lints that app against the
root config.

```jsonc
"lint": "biome lint .",
"lint:fix": "biome lint --write .",
"check": "biome check .",
"check:fix": "biome check --write .",
"format": "biome format --write .",
"check-format": "biome format ."
```

### package.json — dependencies

**Remove** (per app devDeps): `eslint`, `eslint-config-*`, `eslint-plugin-*`,
`eslint-import-resolver-typescript`, `@eslint/*`, `@stylistic/eslint-plugin`,
`@typescript-eslint/*`, `typescript-eslint`, `prettier`, `eslint-config-prettier`,
`eslint-plugin-prettier`, `tsc-files` (if only used by old lint-staged).

**Add**: `"@biomejs/biome": "2.4.16"` (pin to one version fleet-wide).

### Root package.json

- **lint-staged** → Biome:
  ```jsonc
  "**/*.{js,jsx,ts,tsx,json,jsonc,css}": ["biome check --write --no-errors-on-unmatched"]
  ```
- **Drop the pnpm overrides** that existed only for the ESLint stack
  (`eslint`, `@typescript-eslint/*`). Keep `next` / `@types/react*` pins.
- Root devDeps: drop `prettier`, add `@biomejs/biome`.

### Remove old config files

```bash
git rm apps/<app>/eslint.config.mjs apps/<app>/.eslintrc.* apps/<app>/.prettierrc
```

---

## Verify (per repo)

```bash
pnpm install            # removes the eslint stack, installs biome
pnpm lint               # biome via turbo — should be green
pnpm build              # turbo build still green
```

## chunky-crayon specifics

- chunky-crayon's ESLint config is currently **broken** anyway (the
  `eslint-config-next` flat spreads double-register the react-hooks plugin →
  "Cannot redefine plugin"), so there's no working baseline to preserve — Biome is
  a strict improvement.
- It has more apps (`chunky-crayon-web`, `coloring-habitat-web`,
  `chunky-crayon-mobile`, `chunky-crayon-worker`). Run the per-app steps for each
  that has lint config. The **mobile** app (React Native/Expo) may need extra
  `overrides` for RN globals — check `biome lint` output and relax as needed.
- Keep the CC↔CH parity rule: use the **same `biome.json`** in both web apps.

## ptp specifics

- ptp is a multi-repo workspace (`parking-ticket-pal` web + `-worker`). Apply per
  app/repo. The worker is a Hono service — same Biome config works, just point the
  `includes` at its source layout.

## One canonical version

Pin **`@biomejs/biome` to the same version across all repos** (currently
`2.4.16`). When bumping Biome, bump the `$schema` URL in every `biome.json` to
match, and re-run `biome check --write` (formatter output can shift between
versions).
