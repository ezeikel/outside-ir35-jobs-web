import { defineConfig } from 'vitest/config';

/**
 * Root Vitest workspace. Lists each package/app that has unit tests as an
 * explicit project. Add a line below when a new package gains unit tests.
 *
 * Normally tests run via Turborepo (`pnpm test` → `turbo run test`); this
 * root config exists for the `vitest related` pre-commit path, which needs a
 * single Vitest invocation spanning the repo's changed files.
 */
export default defineConfig({
  test: {
    projects: ['./apps/web/vitest.config.mts'],
  },
});
