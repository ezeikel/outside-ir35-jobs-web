import { ContractorDocType } from '@outside-ir35-jobs/db/types';
import { describe, expect, it } from 'vitest';
import { MAX_UPLOAD_BYTES, validateUpload } from './validate';

const valid = {
  type: ContractorDocType.CV,
  mimeType: 'application/pdf',
  size: 1024,
};

describe('validateUpload', () => {
  it('accepts a valid PDF CV', () => {
    const result = validateUpload(valid);
    expect(result).toEqual({ ok: true, type: ContractorDocType.CV });
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
