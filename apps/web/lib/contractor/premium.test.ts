import { describe, expect, it } from 'vitest';
import { isPremium, shouldProviderWriteWin } from './premium';

const now = new Date('2026-06-22T00:00:00Z');
const future = new Date('2026-07-22T00:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');

describe('isPremium', () => {
  it('is false with no subscription', () => {
    expect(isPremium(null, now)).toBe(false);
  });

  it('is true when active and the period is in the future', () => {
    expect(isPremium({ status: 'active', currentPeriodEnd: future }, now)).toBe(
      true,
    );
  });

  it('is true when trialing', () => {
    expect(
      isPremium({ status: 'trialing', currentPeriodEnd: future }, now),
    ).toBe(true);
  });

  it('is false when active but the period has ended', () => {
    expect(isPremium({ status: 'active', currentPeriodEnd: past }, now)).toBe(
      false,
    );
  });

  it('is false for past_due / canceled / incomplete', () => {
    for (const status of ['past_due', 'canceled', 'incomplete', 'unpaid']) {
      expect(isPremium({ status, currentPeriodEnd: future }, now)).toBe(false);
    }
  });

  it('treats active with no period end as premium (Stripe flips status on lapse)', () => {
    expect(isPremium({ status: 'active', currentPeriodEnd: null }, now)).toBe(
      true,
    );
  });
});

describe('shouldProviderWriteWin', () => {
  it('always writes when there is no existing row', () => {
    expect(shouldProviderWriteWin(null, 'REVENUECAT', now)).toBe(true);
    expect(shouldProviderWriteWin(null, 'STRIPE', now)).toBe(true);
  });

  it('the owning provider always wins (even if currently active)', () => {
    const stripeActive = {
      provider: 'STRIPE',
      status: 'active',
      currentPeriodEnd: future,
    };
    expect(shouldProviderWriteWin(stripeActive, 'STRIPE', now)).toBe(true);
  });

  it('a different provider may NOT clobber a currently-active sub', () => {
    const stripeActive = {
      provider: 'STRIPE',
      status: 'active',
      currentPeriodEnd: future,
    };
    // A stale RevenueCat event must not revoke an actively-paying Stripe sub.
    expect(shouldProviderWriteWin(stripeActive, 'REVENUECAT', now)).toBe(false);
  });

  it('a different provider may take over when the existing sub is not live', () => {
    const stripeExpired = {
      provider: 'STRIPE',
      status: 'active',
      currentPeriodEnd: past, // period elapsed → not premium
    };
    expect(shouldProviderWriteWin(stripeExpired, 'REVENUECAT', now)).toBe(true);

    const stripeCanceled = {
      provider: 'STRIPE',
      status: 'canceled',
      currentPeriodEnd: future,
    };
    expect(shouldProviderWriteWin(stripeCanceled, 'REVENUECAT', now)).toBe(
      true,
    );
  });
});
