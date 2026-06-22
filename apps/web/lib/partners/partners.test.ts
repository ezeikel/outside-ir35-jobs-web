import { describe, expect, it } from 'vitest';
import { PARTNERS, partnersByCategory, partnerUrl } from './partners';

const qdos = PARTNERS.find((p) => p.key === 'qdos')!;

describe('partnerUrl', () => {
  it('uses the configured affiliate URL when set', () => {
    expect(
      partnerUrl(qdos, {
        PARTNER_QDOS_URL: 'https://aff.example/qdos?ref=oir35',
      }),
    ).toBe('https://aff.example/qdos?ref=oir35');
  });

  it('falls back to the homepage when no affiliate URL is set', () => {
    expect(partnerUrl(qdos, {})).toBe(qdos.homepage);
    expect(partnerUrl(qdos, { PARTNER_QDOS_URL: '  ' })).toBe(qdos.homepage);
  });
});

describe('partnersByCategory', () => {
  it('splits insurance vs contract-review', () => {
    expect(partnersByCategory('insurance').length).toBeGreaterThan(0);
    expect(
      partnersByCategory('insurance').every((p) => p.category === 'insurance'),
    ).toBe(true);
    expect(
      partnersByCategory('contract-review').every(
        (p) => p.category === 'contract-review',
      ),
    ).toBe(true);
  });
});
