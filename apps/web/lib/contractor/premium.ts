// Premium-subscription gating. Pure + tested: a contractor has premium access when
// their subscription is active (or trialing) AND the current period hasn't ended.
// The Stripe webhook keeps status/currentPeriodEnd in sync; this never trusts the
// client. A small grace is NOT applied — Stripe marks past_due/canceled itself.

export type PremiumState = {
  status: string | null;
  currentPeriodEnd: Date | string | null;
} | null;

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export const isPremium = (
  sub: PremiumState,
  now: Date = new Date(),
): boolean => {
  if (!sub || !sub.status) return false;
  if (!ACTIVE_STATUSES.has(sub.status)) return false;
  // active/trialing without a known period end → treat as premium (Stripe will
  // flip status when it lapses).
  if (!sub.currentPeriodEnd) return true;
  const end = new Date(sub.currentPeriodEnd);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > now.getTime();
};

/**
 * Decide whether an incoming webhook write from `incomingProvider` should be
 * applied to a subscription row that currently belongs to `existing`.
 *
 * We keep ONE row per user (whichever channel they subscribed through). A write
 * from the SAME provider that owns the row always wins (it's the authority for
 * that channel). A write from a DIFFERENT provider wins ONLY if the existing row
 * isn't currently a live premium — so a stale/late event from an idle channel
 * (e.g. an old RevenueCat EXPIRATION) can never revoke a user who is actively
 * paying on the other channel. Pure + tested.
 */
export const shouldProviderWriteWin = (
  existing: {
    provider: string;
    status: string | null;
    currentPeriodEnd: Date | string | null;
  } | null,
  incomingProvider: string,
  now: Date = new Date(),
): boolean => {
  if (!existing) return true; // no row yet — create it
  if (existing.provider === incomingProvider) return true; // same channel — authoritative
  // Different channel: only take over if the current owner isn't live premium.
  return !isPremium(existing, now);
};
