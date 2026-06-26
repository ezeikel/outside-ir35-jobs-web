/**
 * withStoreKitConfig — Expo config plugin (CNG-safe).
 *
 * Local StoreKit testing for `expo run:ios`. A `.storekit` Configuration file
 * resolves RevenueCat/StoreKit products IN THE SIMULATOR without App Store
 * Connect products or a sandbox tester — so the preview variant (which has an RC
 * key) can exercise the purchase UI on a sim. The file does nothing on its own —
 * it must be referenced by the Xcode scheme's Run (Launch) action via a
 * <StoreKitConfigurationFileReference> element in the .xcscheme.
 *
 * `expo prebuild --clean` wipes and regenerates ios/ (including the .xcscheme),
 * so this plugin re-does both steps on every prebuild:
 *   1. copies the source .storekit into ios/ (root)
 *   2. injects <StoreKitConfigurationFileReference> into the regenerated
 *      scheme's <LaunchAction> (Debug/run only — never Profile/Archive, so
 *      release/EAS store builds don't ship a test config).
 *
 * Why withDangerousMod: there is no first-class Expo mod for .xcscheme XML
 * (withXcodeProject edits .pbxproj, not schemes). The dangerous ios mod runs
 * AFTER the native project + scheme are generated but BEFORE pod install — the
 * correct window. (Carried over from the sibling Chewy Bytes apps.)
 *
 * The scheme/project name is DYNAMIC in this repo (per EXPO_PUBLIC_ENVIRONMENT
 * the app name changes), so NEVER hardcode it — we glob for the scheme.
 *
 * props:
 *   relativePath?: string  Path to the .storekit relative to the project root
 *                          (the dir containing app.config.ts).
 *                          Default: 'ios-config/OutsideIR35Jobs.storekit'.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const REF_MARKER = "StoreKitConfigurationFileReference";

/** Recursively find the single shared .xcscheme under ios/. */
function findSchemePath(iosRoot) {
  const projectDir = fs
    .readdirSync(iosRoot)
    .find((f) => f.endsWith(".xcodeproj"));
  if (!projectDir) {
    throw new Error(
      `[withStoreKitConfig] No .xcodeproj found in ${iosRoot}. ` +
        "Run prebuild so the native project exists.",
    );
  }
  const schemesDir = path.join(
    iosRoot,
    projectDir,
    "xcshareddata",
    "xcschemes",
  );
  if (!fs.existsSync(schemesDir)) {
    throw new Error(`[withStoreKitConfig] No xcschemes dir at ${schemesDir}.`);
  }
  const schemes = fs
    .readdirSync(schemesDir)
    .filter((f) => f.endsWith(".xcscheme"));
  // Prefer the scheme whose basename matches the .xcodeproj basename
  // (the app scheme), falling back to the first .xcscheme.
  const projectBase = projectDir.replace(/\.xcodeproj$/, "");
  const appScheme =
    schemes.find((s) => s === `${projectBase}.xcscheme`) || schemes[0];
  if (!appScheme) {
    throw new Error(`[withStoreKitConfig] No .xcscheme found in ${schemesDir}.`);
  }
  return path.join(schemesDir, appScheme);
}

module.exports = function withStoreKitConfig(config, props = {}) {
  const srcRel = props.relativePath || "ios-config/OutsideIR35Jobs.storekit";

  return withDangerousMod(config, [
    "ios",
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot; // .../apps/mobile/ios
      const projectRoot = cfg.modRequest.projectRoot; // .../apps/mobile
      const srcAbs = path.join(projectRoot, srcRel);

      if (!fs.existsSync(srcAbs)) {
        throw new Error(
          `[withStoreKitConfig] Source .storekit not found at ${srcAbs}. ` +
            "Set props.relativePath or create the file.",
        );
      }

      const storekitName = path.basename(srcAbs); // OutsideIR35Jobs.storekit

      // 1) Copy the .storekit into ios/ root (re-copied every prebuild).
      const destAbs = path.join(iosRoot, storekitName);
      fs.copyFileSync(srcAbs, destAbs);

      // 2) Inject the reference into the generated scheme's LaunchAction.
      const schemePath = findSchemePath(iosRoot);
      let xml = fs.readFileSync(schemePath, "utf8");

      if (xml.includes(REF_MARKER)) {
        // Idempotent: already injected (e.g. re-run without --clean).
        return cfg;
      }

      // `identifier` is RELATIVE TO THE .xcscheme FILE, which sits 3 dirs deep
      // (xcschemes -> xcshareddata -> <proj>.xcodeproj -> ios). A file at ios/
      // root is therefore ../../../<name>. Getting depth wrong = Xcode silently
      // ignores the config (no error, IAPs just don't appear).
      const ref =
        `      <StoreKitConfigurationFileReference\n` +
        `         identifier = "../../../${storekitName}">\n` +
        `      </StoreKitConfigurationFileReference>`;

      // Insert as a direct child of <LaunchAction>, right before its close tag.
      if (!/<\/LaunchAction>/.test(xml)) {
        throw new Error(
          `[withStoreKitConfig] No </LaunchAction> in ${schemePath}; ` +
            "scheme template changed — re-verify after an Expo SDK bump.",
        );
      }
      xml = xml.replace(/([ \t]*)<\/LaunchAction>/, `${ref}\n$1</LaunchAction>`);
      fs.writeFileSync(schemePath, xml, "utf8");

      return cfg;
    },
  ]);
};
