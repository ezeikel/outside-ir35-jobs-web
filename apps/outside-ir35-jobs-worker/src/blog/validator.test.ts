import { describe, expect, it } from 'vitest';
import {
  DISCLAIMER_FRAGMENT,
  FORBIDDEN_PHRASES,
  MIN_SAMPLE,
  validatePost,
} from './validator.js';

// A clean, honest IR35-guidance post body: attributes the client's claim and
// carries the disclaimer.
const CLEAN_GUIDANCE = `## What outside IR35 means

When a listing says a role is outside IR35, that is the client's stated
position — the client states this based on their own assessment.

Only the end client can determine status via an SDS.

This platform does not determine, verify, or warrant IR35 status; the SDS is
the client's legal responsibility.`;

describe('validatePost — forbidden phrases', () => {
  it('rejects "verified outside IR35"', () => {
    const r = validatePost({
      markdown: 'This role is verified outside IR35 by our team.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.violations).toContainEqual({
      kind: 'forbidden_phrase',
      phrase: 'verified outside ir35',
    });
  });

  it('rejects "IR35-compliant" and "guaranteed outside IR35"', () => {
    const r = validatePost({
      markdown: 'A guaranteed outside IR35, IR35-compliant contract.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(false);
    const phrases = r.violations
      .filter((v) => v.kind === 'forbidden_phrase')
      .map((v) => (v as { phrase: string }).phrase);
    expect(phrases).toContain('guaranteed outside ir35');
    expect(phrases).toContain('ir35-compliant');
  });

  it('rejects mentioning EASI (abolished regulator)', () => {
    const r = validatePost({
      markdown:
        'The EASI enforces these rules. The client states it is outside IR35.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.violations).toContainEqual({
      kind: 'forbidden_phrase',
      phrase: 'easi',
    });
  });
});

describe('validatePost — disclaimer', () => {
  it('requires the disclaimer on IR35-guidance posts', () => {
    const r = validatePost({
      markdown:
        '## IR35\nThe client states the role is outside IR35. No disclaimer here.',
      isIr35Guidance: true,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.violations).toContainEqual({ kind: 'missing_disclaimer' });
  });

  it('passes a clean guidance post with the disclaimer + attribution', () => {
    const r = validatePost({
      markdown: CLEAN_GUIDANCE,
      isIr35Guidance: true,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it('does not require the disclaimer on non-guidance posts', () => {
    const r = validatePost({
      markdown: '## Contracting tips\nKeep good records and invoice promptly.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(true);
  });
});

describe('validatePost — attribution', () => {
  it('rejects an unattributed "outside IR35" paragraph', () => {
    const r = validatePost({
      markdown: 'This contract is outside IR35 and pays well.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(false);
    expect(r.violations.some((v) => v.kind === 'missing_attribution')).toBe(
      true,
    );
  });

  it('accepts an attributed "outside IR35" paragraph', () => {
    const r = validatePost({
      markdown: 'The client states this contract is outside IR35.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.ok).toBe(true);
  });

  it('does NOT flag conceptual mentions of the term "outside IR35"', () => {
    const conceptual = [
      'The phrase "outside IR35" is one you will encounter on most engagements.',
      'This guide explains what outside IR35 means in practice.',
      'Understanding outside IR35 status affects how you are taxed.',
    ];
    for (const md of conceptual) {
      const r = validatePost({
        markdown: md,
        isIr35Guidance: false,
        dataBacked: false,
        benchmarkSampleCount: 0,
      });
      expect(r.violations.some((v) => v.kind === 'missing_attribution')).toBe(
        false,
      );
    }
  });

  it('flags an unattributed ASSERTION that a role is outside IR35', () => {
    const r = validatePost({
      markdown: 'This role is outside IR35, so you keep more of your rate.',
      isIr35Guidance: false,
      dataBacked: false,
      benchmarkSampleCount: 0,
    });
    expect(r.violations.some((v) => v.kind === 'missing_attribution')).toBe(
      true,
    );
  });
});

describe('validatePost — data-backed gate', () => {
  it('rejects a data-backed post below MIN_SAMPLE', () => {
    const r = validatePost({
      markdown:
        '## Day rates\nThe client states figures across a few contracts.',
      isIr35Guidance: false,
      dataBacked: true,
      benchmarkSampleCount: MIN_SAMPLE - 1,
    });
    expect(r.ok).toBe(false);
    expect(r.violations).toContainEqual({
      kind: 'data_backed_no_data',
      sampleCount: MIN_SAMPLE - 1,
    });
  });

  it('accepts a data-backed post at or above MIN_SAMPLE', () => {
    const r = validatePost({
      markdown: '## Day rates\nBased on live contracts the client states.',
      isIr35Guidance: false,
      dataBacked: true,
      benchmarkSampleCount: MIN_SAMPLE,
    });
    expect(r.ok).toBe(true);
  });
});

describe('exports', () => {
  it('has a sane forbidden-phrase set and disclaimer fragment', () => {
    expect(FORBIDDEN_PHRASES).toContain('ir35-compliant');
    expect(DISCLAIMER_FRAGMENT).toMatch(/warrant ir35 status/);
    expect(MIN_SAMPLE).toBe(5);
  });
});
