import { describe, expect, it } from 'vitest';
import { isPremium } from '@/lib/contractor/premium';
import {
  mapRevenueCatEvent,
  type RevenueCatEvent,
} from '@/lib/mobile/revenuecat';

// The RevenueCat event → Subscription mapping is money-adjacent (it decides who
// has premium), so it's unit-tested. The contract: the mapped status + period
// must make isPremium() agree with the user's real entitlement.

const baseEvent = (
  over: Partial<RevenueCatEvent> & { type: RevenueCatEvent['type'] },
): RevenueCatEvent => ({
  id: 'evt_1',
  app_user_id: 'user_123',
  product_id: 'oir35_premium_monthly',
  ...over,
});

const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
const past = Date.now() - 24 * 60 * 60 * 1000;

describe('mapRevenueCatEvent', () => {
  it('an initial purchase makes the user premium', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'INITIAL_PURCHASE', expiration_at_ms: future }),
    );
    expect(sync).not.toBeNull();
    expect(sync?.userId).toBe('user_123');
    expect(sync?.status).toBe('active');
    expect(sync?.cancelAtPeriodEnd).toBe(false);
    expect(isPremium(sync)).toBe(true);
  });

  it('a TRIAL initial purchase is trialing and premium', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({
        type: 'INITIAL_PURCHASE',
        period_type: 'TRIAL',
        expiration_at_ms: future,
      }),
    );
    expect(sync?.status).toBe('trialing');
    expect(isPremium(sync)).toBe(true);
  });

  it('a renewal keeps the user premium and extends the period', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'RENEWAL', expiration_at_ms: future }),
    );
    expect(sync?.status).toBe('active');
    expect(isPremium(sync)).toBe(true);
  });

  it('a cancellation keeps access until period end + flags cancelAtPeriodEnd', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'CANCELLATION', expiration_at_ms: future }),
    );
    expect(sync?.status).toBe('active');
    expect(sync?.cancelAtPeriodEnd).toBe(true);
    // Still premium — they keep access until the period ends.
    expect(isPremium(sync)).toBe(true);
  });

  it('an expiration revokes premium', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'EXPIRATION', expiration_at_ms: past }),
    );
    expect(sync?.status).toBe('canceled');
    expect(isPremium(sync)).toBe(false);
  });

  it('a billing issue is past_due → not premium', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'BILLING_ISSUE', expiration_at_ms: past }),
    );
    expect(sync?.status).toBe('past_due');
    expect(isPremium(sync)).toBe(false);
  });

  it('a past period end is not premium even when status is active', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({ type: 'RENEWAL', expiration_at_ms: past }),
    );
    expect(sync?.status).toBe('active');
    // active but expired → isPremium false (period gate).
    expect(isPremium(sync)).toBe(false);
  });

  it('ignores TEST / alias / transfer events', () => {
    expect(mapRevenueCatEvent(baseEvent({ type: 'TEST' }))).toBeNull();
    expect(
      mapRevenueCatEvent(baseEvent({ type: 'SUBSCRIBER_ALIAS' })),
    ).toBeNull();
    expect(mapRevenueCatEvent(baseEvent({ type: 'TRANSFER' }))).toBeNull();
  });

  it('ignores anonymous RevenueCat ids', () => {
    const sync = mapRevenueCatEvent(
      baseEvent({
        type: 'INITIAL_PURCHASE',
        app_user_id: '$RCAnonymousID:abc123',
        expiration_at_ms: future,
      }),
    );
    expect(sync).toBeNull();
  });
});
