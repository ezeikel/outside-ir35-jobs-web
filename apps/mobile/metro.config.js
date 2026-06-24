// Replaces `const { getDefaultConfig } = require('expo/metro-config')` — uses
// Sentry's wrapper so source maps upload on EAS builds.
const path = require("path");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const { withNativeWind } = require("nativewind/metro");

const config = getSentryExpoConfig(__dirname);

// ── react-native-screens/experimental resolver shim ──────────────────────────
// expo-router's experimental-stack does `require("react-native-screens/
// experimental")` at module load and pulls it into the graph even though this
// app only uses the standard <Stack>. Metro's `unstable_enablePackageExports`
// (the SDK 56 / Sentry default) resolves subpaths via `exports`, but
// react-native-screens 4.25.2 ships no `exports` field and exposes the subpath
// via a nested package.json redirect stub that package-exports skips — so Metro
// redboxes "could not be found" on every screen. Map the one subpath to its real
// source entry and delegate the rest. (Carried over from the sibling apps;
// remove if rn-screens gains an `exports` map.)
const RN_SCREENS_EXPERIMENTAL = path.join(
  path.dirname(require.resolve("react-native-screens/package.json")),
  "src/experimental/index.ts",
);
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native-screens/experimental") {
    return { type: "sourceFile", filePath: RN_SCREENS_EXPERIMENTAL };
  }
  const next = baseResolveRequest ?? context.resolveRequest;
  return next(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
