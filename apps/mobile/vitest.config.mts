import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Minimal config for unit-testing PURE logic only (no RN runtime). Tests must
// `import type` anything from RN/axios-backed modules so nothing loads at runtime.
export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
