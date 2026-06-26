/**
 * RevenueCat webhook → Subscription mapping. Pure logic (no DB / no secrets), so
 * it's unit-testable and intentionally NOT marked `server-only` — the webhook
 * route is the server boundary. Mobile premium is bought via
 * StoreKit / Play Billing (App/Play store rules forbid Stripe for in-app digital
 * subscriptions), wrapped by RevenueCat. RC POSTs us an event; we normalise it to
 * the SAME Stripe-style { status, currentPeriodEnd } the Subscription row already
 * carries — so isPremium() (which reads only those two fields) unlocks a mobile
 * sub identically to a web Stripe sub, with zero gating changes.
 *
 * Mirrors the chunky-crayon RevenueCat webhook contract.
 */

export type RevenueCatEventType =
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'EXPIRATION'
  | 'SUBSCRIBER_ALIAS'
  | 'TRANSFER'
  | 'NON_RENEWING_PURCHASE'
  | 'TEST';

export type RevenueCatEvent = {
  id: string;
  type: RevenueCatEventType;
  app_user_id: string;
  original_app_user_id?: string;
  product_id?: string;
  period_type?: 'NORMAL' | 'TRIAL' | 'INTRO';
  purchased_at_ms?: number;
  expiration_at_ms?: number | null;
  environment?: 'SANDBOX' | 'PRODUCTION';
  store?: 'APP_STORE' | 'PLAY_STORE' | 'AMAZON' | 'STRIPE' | 'PROMOTIONAL';
  cancel_reason?: string;
  // The store's unique transaction id (always present on purchase events). Used
  // to reconcile a one-time job-post purchase → its Job, idempotently.
  transaction_id?: string;
};

export type RevenueCatWebhookBody = {
  api_version?: string;
  event: RevenueCatEvent;
};

// What the webhook should write onto the Subscription row, or null if the event
// is one we don't act on (TEST, SUBSCRIBER_ALIAS, TRANSFER, etc.).
export type RevenueCatSync = {
  userId: string;
  revenueCatProductId: string | null;
  status: string; // Stripe-style: active | trialing | past_due | canceled
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null;

// Store identifiers (RC dashboard / ASC) of the one-time job-post product, prod
// + internal variant. A NON_RENEWING_PURCHASE of one of these is a paid job post
// (not a premium subscription) — it flips a PENDING Job to PAID rather than
// touching the Subscription row. Keep in sync with the RC dashboard.
export const JOB_POST_PRODUCT_IDS = new Set([
  'job_post_v1',
  'job_post_internal_v1',
]);

// A job-post purchase to reconcile, or null if the event isn't one. The
// transaction_id is the store's unique id — stored on the Job for idempotency so
// RC's at-least-once delivery can't double-publish.
export type RevenueCatJobPurchase = {
  userId: string;
  transactionId: string;
  productId: string;
} | null;

/**
 * Map a RevenueCat webhook event to a job-post purchase, or null if it isn't a
 * NON_RENEWING_PURCHASE of a job-post product. The webhook stamps the
 * transaction id on the user's pending job and flips it to PAID.
 */
export const mapRevenueCatJobPurchase = (
  event: RevenueCatEvent,
): RevenueCatJobPurchase => {
  if (event.type !== 'NON_RENEWING_PURCHASE') return null;
  if (!event.app_user_id) return null;
  if (event.app_user_id.startsWith('$RCAnonymousID:')) return null;
  if (!event.product_id || !JOB_POST_PRODUCT_IDS.has(event.product_id)) {
    return null;
  }
  if (!event.transaction_id) return null;
  return {
    userId: event.app_user_id,
    transactionId: event.transaction_id,
    productId: event.product_id,
  };
};

const statusForEvent = (
  type: RevenueCatEventType,
  periodType: RevenueCatEvent['period_type'],
): { status: string; cancelAtPeriodEnd: boolean } | null => {
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      // TRIAL period → 'trialing' (still premium); otherwise active.
      return {
        status: periodType === 'TRIAL' ? 'trialing' : 'active',
        cancelAtPeriodEnd: false,
      };
    case 'CANCELLATION':
      // User turned off auto-renew but keeps access until expiration_at_ms.
      // Stay 'active' (isPremium checks currentPeriodEnd) but flag the pending
      // cancel so the UI can say "renews/ends on …".
      return { status: 'active', cancelAtPeriodEnd: true };
    case 'BILLING_ISSUE':
      return { status: 'past_due', cancelAtPeriodEnd: false };
    case 'EXPIRATION':
      return { status: 'canceled', cancelAtPeriodEnd: false };
    default:
      // TEST, SUBSCRIBER_ALIAS, TRANSFER, NON_RENEWING_PURCHASE — not acted on.
      return null;
  }
};

/**
 * Map a RevenueCat webhook event to the row write, or null to skip. The
 * app_user_id IS the DB user id (the app configures RC with appUserID=userId).
 */
export const mapRevenueCatEvent = (event: RevenueCatEvent): RevenueCatSync => {
  if (!event.app_user_id) return null;
  // Ignore RevenueCat's anonymous ids — those never map to a real user.
  if (event.app_user_id.startsWith('$RCAnonymousID:')) return null;

  const mapped = statusForEvent(event.type, event.period_type);
  if (!mapped) return null;

  return {
    userId: event.app_user_id,
    revenueCatProductId: event.product_id ?? null,
    status: mapped.status,
    currentPeriodEnd:
      typeof event.expiration_at_ms === 'number'
        ? new Date(event.expiration_at_ms)
        : null,
    cancelAtPeriodEnd: mapped.cancelAtPeriodEnd,
  };
};
