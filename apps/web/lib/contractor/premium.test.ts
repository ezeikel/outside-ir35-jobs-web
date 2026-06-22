import { describe, expect, it } from 'vitest';
import { isPremium } from './premium';

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
