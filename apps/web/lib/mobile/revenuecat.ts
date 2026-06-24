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
