import { describe, expect, it } from 'vitest';
import { Ir35InsuranceSchema } from './types';

describe('Ir35InsuranceSchema', () => {
  it('requires provider + expiry when holds is true', () => {
    expect(Ir35InsuranceSchema.safeParse({ holds: true }).success).toBe(false);
    expect(
      Ir35InsuranceSchema.safeParse({ holds: true, provider: 'Qdos' }).success,
    ).toBe(false);
    expect(
      Ir35InsuranceSchema.safeParse({
        holds: true,
        provider: 'Qdos',
        expiresAt: '2027-01-01',
      }).success,
    ).toBe(true);
  });

  it('allows clearing (holds=false) with no other fields', () => {
    expect(Ir35InsuranceSchema.safeParse({ holds: false }).success).toBe(true);
  });

  it('coerces the expiry string to a Date', () => {
    const parsed = Ir35InsuranceSchema.parse({
      holds: true,
      provider: 'Markel Tax',
      expiresAt: '2027-03-15',
    });
    expect(parsed.expiresAt).toBeInstanceOf(Date);
  });
});
