import { JobIR35Signal } from '@outside-ir35-jobs/db/types';
import { describe, expect, it } from 'vitest';
import { ir35Bucket, jobMidpoint, MIN_SAMPLE } from './compute';

describe('jobMidpoint', () => {
  it('returns the single rate for [n]', () => {
    expect(jobMidpoint([500])).toBe(500);
  });
  it('returns the rounded midpoint for [min,max]', () => {
    expect(jobMidpoint([500, 600])).toBe(550);
    expect(jobMidpoint([600, 675])).toBe(638); // (1275/2)=637.5 → 638
  });
  it('returns null for empty / missing', () => {
    expect(jobMidpoint([])).toBeNull();
    expect(jobMidpoint(null)).toBeNull();
    expect(jobMidpoint(undefined)).toBeNull();
  });
});

describe('ir35Bucket', () => {
  it('maps outside-leaning signals to OUTSIDE', () => {
    expect(ir35Bucket(JobIR35Signal.CLIENT_INTENDS_OUTSIDE)).toBe('OUTSIDE');
    expect(ir35Bucket(JobIR35Signal.SDS_ISSUED)).toBe('OUTSIDE');
    expect(ir35Bucket(JobIR35Signal.CONTRACT_REVIEW_HELD)).toBe('OUTSIDE');
    expect(ir35Bucket(JobIR35Signal.SMALL_CLIENT_EXEMPT)).toBe('OUTSIDE');
  });
  it('maps INSIDE and UNKNOWN', () => {
    expect(ir35Bucket(JobIR35Signal.INSIDE)).toBe('INSIDE');
    expect(ir35Bucket(JobIR35Signal.UNKNOWN)).toBe('UNKNOWN');
    expect(ir35Bucket('anything-else')).toBe('UNKNOWN');
  });
});

describe('MIN_SAMPLE', () => {
  it('is a meaningful gate (>= 5)', () => {
    expect(MIN_SAMPLE).toBeGreaterThanOrEqual(5);
  });
});
