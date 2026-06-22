// Flat ESLint config (ESLint 9). The monorepo hoists ESLint 9, which requires
// flat config, so we use eslint-config-expo's flat entry rather than the legacy
// .eslintrc the other Chewy Bytes apps still use.
const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "expo-env.d.ts", "nativewind-env.d.ts"],
  },
];
