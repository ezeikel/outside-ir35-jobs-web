import { ContractorDocType, DocStatus } from '@outside-ir35-jobs/db/types';
import { describe, expect, it } from 'vitest';
import {
  computeDocStatus,
  EXPIRY_WARN_DAYS,
  isInsuranceType,
  MAX_UPLOAD_BYTES,
  parseCoverLimit,
  parseExpiry,
  tracksExpiry,
  validateUpload,
} from './validate';

const valid = {
  type: ContractorDocType.PI_INSURANCE,
  mimeType: 'application/pdf',
  size: 1024,
};

describe('validateUpload', () => {
  it('accepts a valid PDF compliance doc', () => {
    const result = validateUpload(valid);
    expect(result).toEqual({ ok: true, type: ContractorDocType.PI_INSURANCE });
  });

  it('rejects a CV (CVs upload via the CV flow, not the doc flow)', () => {
    const result = validateUpload({ ...valid, type: ContractorDocType.CV });
    expect(result.ok).toBe(false);
  });

  it('accepts each allowed mime type', () => {
    for (const mimeType of [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]) {
      expect(validateUpload({ ...valid, mimeType }).ok).toBe(true);
    }
  });

  it('rejects an unknown document type', () => {
    const result = validateUpload({ ...valid, type: 'NOT_A_TYPE' });
    expect(result).toEqual({ ok: false, error: 'Unknown document type.' });
  });

  it('rejects an empty document type', () => {
    expect(validateUpload({ ...valid, type: '' }).ok).toBe(false);
  });

  it('rejects a disallowed mime type', () => {
    const result = validateUpload({ ...valid, mimeType: 'application/zip' });
    expect(result.ok).toBe(false);
  });

  it('rejects an empty/zero-byte file', () => {
    expect(validateUpload({ ...valid, size: 0 }).ok).toBe(false);
  });

  it('accepts a file exactly at the size limit', () => {
    expect(validateUpload({ ...valid, size: MAX_UPLOAD_BYTES }).ok).toBe(true);
  });

  it('rejects a file one byte over the size limit', () => {
    const result = validateUpload({ ...valid, size: MAX_UPLOAD_BYTES + 1 });
    expect(result).toEqual({
      ok: false,
      error: 'File must be 10 MB or smaller.',
    });
  });
});

describe('isInsuranceType / tracksExpiry', () => {
  it('flags the three insurance certs as insurance', () => {
    for (const t of [
      ContractorDocType.PI_INSURANCE,
      ContractorDocType.PL_INSURANCE,
      ContractorDocType.EL_INSURANCE,
    ]) {
      expect(isInsuranceType(t)).toBe(true);
    }
  });

  it('does not flag non-insurance types as insurance', () => {
    for (const t of [
      ContractorDocType.CV,
      ContractorDocType.INCORPORATION,
      ContractorDocType.RIGHT_TO_WORK,
    ]) {
      expect(isInsuranceType(t)).toBe(false);
    }
  });

  it('tracks expiry for insurance + right-to-work, not others', () => {
    expect(tracksExpiry(ContractorDocType.PI_INSURANCE)).toBe(true);
    expect(tracksExpiry(ContractorDocType.RIGHT_TO_WORK)).toBe(true);
    expect(tracksExpiry(ContractorDocType.CV)).toBe(false);
    expect(tracksExpiry(ContractorDocType.INCORPORATION)).toBe(false);
    expect(tracksExpiry(ContractorDocType.VAT_CERTIFICATE)).toBe(false);
  });
});

describe('parseCoverLimit', () => {
  it('parses a positive number to whole pounds', () => {
    expect(parseCoverLimit('1000000')).toBe(1_000_000);
    expect(parseCoverLimit(2_500_000)).toBe(2_500_000);
    expect(parseCoverLimit('1000000.7')).toBe(1_000_001); // rounds
  });

  it('returns null for blank / non-numeric / non-positive', () => {
    expect(parseCoverLimit('')).toBeNull();
    expect(parseCoverLimit(null)).toBeNull();
    expect(parseCoverLimit(undefined)).toBeNull();
    expect(parseCoverLimit('abc')).toBeNull();
    expect(parseCoverLimit('0')).toBeNull();
    expect(parseCoverLimit('-5')).toBeNull();
  });
});

describe('parseExpiry', () => {
  it('parses a date string to a Date', () => {
    const d = parseExpiry('2027-01-15');
    expect(d).toBeInstanceOf(Date);
    expect(d?.getUTCFullYear()).toBe(2027);
  });

  it('returns null for blank / unparseable', () => {
    expect(parseExpiry('')).toBeNull();
    expect(parseExpiry(null)).toBeNull();
    expect(parseExpiry('not-a-date')).toBeNull();
  });
});

describe('computeDocStatus', () => {
  const now = new Date('2026-06-20T12:00:00Z');
  const daysFromNow = (n: number) =>
    new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  it('is ON_FILE with no expiry', () => {
    expect(computeDocStatus(null, now)).toBe(DocStatus.ON_FILE);
    expect(computeDocStatus(undefined, now)).toBe(DocStatus.ON_FILE);
  });

  it('is ON_FILE comfortably before the warn window', () => {
    expect(computeDocStatus(daysFromNow(EXPIRY_WARN_DAYS + 1), now)).toBe(
      DocStatus.ON_FILE,
    );
    expect(computeDocStatus(daysFromNow(365), now)).toBe(DocStatus.ON_FILE);
  });

  it('is EXPIRING exactly at the warn window and within it', () => {
    expect(computeDocStatus(daysFromNow(EXPIRY_WARN_DAYS), now)).toBe(
      DocStatus.EXPIRING,
    );
    expect(computeDocStatus(daysFromNow(1), now)).toBe(DocStatus.EXPIRING);
  });

  it('is FAILED on the expiry instant and after', () => {
    expect(computeDocStatus(now, now)).toBe(DocStatus.FAILED);
    expect(computeDocStatus(daysFromNow(-1), now)).toBe(DocStatus.FAILED);
  });
});
