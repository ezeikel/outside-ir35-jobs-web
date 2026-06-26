import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";
import { Platform } from "react-native";

// RevenueCat client. Mobile premium is bought via StoreKit / Play Billing
// (App/Play store rules forbid Stripe in-app), wrapped by RevenueCat. We
// configure RC with appUserID = the DB user id so a purchase keys to that user;
// the RC webhook then writes the entitlement to our DB, which is the
// AUTHORITATIVE premium source the app reads via /api/mobile/premium. Mirrors the
// sibling Chewy Bytes apps (chunky-crayon).

// The RevenueCat "entitlement" id configured in the RC dashboard that grants
// premium. Keep in sync with the dashboard.
export const PREMIUM_ENTITLEMENT_ID = "premium";

const API_KEYS = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
};

let isConfigured = false;
let configuredUserId: string | null = null;

/**
 * Configure RevenueCat once at app startup (and re-anchor to the user id when we
 * learn it). Safe to call repeatedly. Returns false if no key is set (premium is
 * then simply unavailable — the paywall shows an "unavailable" state rather than
 * crashing).
 */
export const initializeRevenueCat = async (userId?: string): Promise<boolean> => {
  if (isConfigured) {
    // Already configured. If we now know a user id but RC is on a different/anon
    // id, alias the existing customer to it so a purchase keys to the DB user.
    if (userId && configuredUserId !== userId) {
      try {
        await Purchases.logIn(userId);
        configuredUserId = userId;
      } catch {
        // best-effort — leave the existing identity
      }
    }
    return true;
  }

  const apiKey = Platform.OS === "ios" ? API_KEYS.ios : API_KEYS.android;
  if (!apiKey) {
    // No key configured yet (RC project not provisioned) — premium unavailable.
    return false;
  }

  // A non-dev build using a test_ key points at the RC test store — purchases
  // would never reach the real store. Fail LOUDLY (captured by Sentry) instead
  // of shipping a dead paywall.
  const env = process.env.EXPO_PUBLIC_ENVIRONMENT ?? "development";
  if (env !== "development" && apiKey.startsWith("test_")) {
    console.error(
      `[RevenueCat] FATAL: ${env} build using a TEST API key for ${Platform.OS} — purchases point at the test store.`,
    );
  }

  try {
    // INFO (not DEBUG) in dev: DEBUG makes the RC SDK log an offerings-fetch
    // failure as a console.error, which RN's LogBox promotes to a fullscreen
    // redbox on every launch while the store products don't exist yet (no ASC
    // IAPs). The failure is expected + handled (getOfferings returns null), so we
    // don't want it to interrupt. INFO keeps useful logs without the redbox.
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.INFO);
    await Purchases.configure({ apiKey, appUserID: userId });
    isConfigured = true;
    configuredUserId = userId ?? null;
    return true;
  } catch (e) {
    console.error("[RevenueCat] configure failed:", e);
    return false;
  }
};

/** Lazy guard so any accessor self-heals if configure() hasn't run yet. */
const ensureConfigured = async (): Promise<boolean> => {
  if (isConfigured) return true;
  return initializeRevenueCat();
};

/** The current premium offering (packages to buy), or null if none/unavailable. */
export const getPremiumOffering =
  async (): Promise<PurchasesOffering | null> => {
    if (!(await ensureConfigured())) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    } catch {
      return null;
    }
  };

// The RC offering identifier (lookup_key) holding the one-time job-post product.
// Not the current offering (that's `default` = premium); fetched by id from
// getOfferings().all. Keep in sync with the RC dashboard.
const JOB_POSTS_OFFERING_ID = "job_posts";

/**
 * The first purchasable package in the job-posts offering (the £219 one-time job
 * post), or null if unavailable. Distinct from the premium offering — a job post
 * is a per-post consumable, not a subscription/entitlement.
 */
export const getJobPostPackage =
  async (): Promise<PurchasesPackage | null> => {
    if (!(await ensureConfigured())) return null;
    try {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all[JOB_POSTS_OFFERING_ID];
      return offering?.availablePackages?.[0] ?? null;
    } catch {
      return null;
    }
  };

/** Buy a package. Returns the resulting CustomerInfo, or null on cancel/failure. */
export const purchasePackage = async (
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> => {
  if (!(await ensureConfigured())) return null;
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (e) {
    // User cancellation is not an error worth surfacing.
    if (
      e &&
      typeof e === "object" &&
      "userCancelled" in e &&
      (e as { userCancelled?: boolean }).userCancelled
    ) {
      return null;
    }
    throw e;
  }
};

/** Restore prior purchases (App Store / Play). Returns CustomerInfo or null. */
export const restorePurchases = async (): Promise<CustomerInfo | null> => {
  if (!(await ensureConfigured())) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
};

/** Whether RC's client-side entitlement is active (a fast, optimistic check). */
export const hasActiveEntitlement = (info: CustomerInfo | null): boolean =>
  !!info?.entitlements.active[PREMIUM_ENTITLEMENT_ID];
