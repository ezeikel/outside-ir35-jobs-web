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
