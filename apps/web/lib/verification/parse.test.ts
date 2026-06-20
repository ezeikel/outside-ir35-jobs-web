import { describe, expect, it } from 'vitest';
import {
  isValidCompanyNumberShape,
  isValidVatNumberShape,
  mapCompaniesHouseHttp,
  mapCompanyProfile,
  normalizeCompanyNumber,
  normalizeVatNumber,
} from './parse';

describe('normalizeCompanyNumber', () => {
  it('zero-pads pure-digit numbers to 8', () => {
    expect(normalizeCompanyNumber('6')).toBe('00000006');
    expect(normalizeCompanyNumber('12345678')).toBe('12345678');
  });
  it('uppercases + strips spaces, leaves prefixed numbers', () => {
    expect(normalizeCompanyNumber(' sc123456 ')).toBe('SC123456');
    expect(normalizeCompanyNumber('oc 123456')).toBe('OC123456');
  });
});

describe('isValidCompanyNumberShape', () => {
  it('accepts 8 digits and prefix+6digits', () => {
    expect(isValidCompanyNumberShape('12345678')).toBe(true);
    expect(isValidCompanyNumberShape('6')).toBe(true); // pads to 00000006
    expect(isValidCompanyNumberShape('SC123456')).toBe(true);
  });
  it('rejects junk', () => {
    expect(isValidCompanyNumberShape('')).toBe(false);
    expect(isValidCompanyNumberShape('ABCDEFGH')).toBe(false); // 8 letters
    expect(isValidCompanyNumberShape('SC12345')).toBe(false); // prefix + only 5 digits
    expect(isValidCompanyNumberShape('123456789')).toBe(false); // 9 digits, too long
  });

  it('zero-pads short pure-digit numbers (still valid)', () => {
    expect(isValidCompanyNumberShape('123')).toBe(true); // → 00000123
  });
});

describe('mapCompanyProfile', () => {
  it('active company → verified, with name + address', () => {
    const r = mapCompanyProfile({
      company_name: 'Acme Ltd',
      company_status: 'active',
      registered_office_address: {
        address_line_1: '1 High St',
        locality: 'London',
        postal_code: 'EC1A 1AA',
      },
    });
    expect(r.status).toBe('verified');
    expect(r.name).toBe('Acme Ltd');
    expect(r.address).toBe('1 High St, London, EC1A 1AA');
  });

  it('dissolved/other status → inactive', () => {
    expect(mapCompanyProfile({ company_status: 'dissolved' }).status).toBe(
      'inactive',
    );
    expect(mapCompanyProfile({ company_status: 'liquidation' }).status).toBe(
      'inactive',
    );
  });

  it('missing status → inactive (not verified)', () => {
    expect(mapCompanyProfile({}).status).toBe('inactive');
  });
});

describe('mapCompaniesHouseHttp', () => {
  it('404 → not_found', () => {
    expect(mapCompaniesHouseHttp(404).status).toBe('not_found');
  });
  it('401 / 429 / 500 → error', () => {
    expect(mapCompaniesHouseHttp(401).status).toBe('error');
    expect(mapCompaniesHouseHttp(429).status).toBe('error');
    expect(mapCompaniesHouseHttp(500).status).toBe('error');
  });
});

describe('VAT number normalization + shape', () => {
  it('strips GB prefix + spaces, uppercases', () => {
    expect(normalizeVatNumber('gb 123 4567 89')).toBe('123456789');
    expect(normalizeVatNumber('GB123456789')).toBe('123456789');
  });
  it('accepts 9 or 12 digit VRNs', () => {
    expect(isValidVatNumberShape('123456789')).toBe(true);
    expect(isValidVatNumberShape('GB123456789012')).toBe(true);
    expect(isValidVatNumberShape('12345')).toBe(false);
    expect(isValidVatNumberShape('abcdefghi')).toBe(false);
  });
});
