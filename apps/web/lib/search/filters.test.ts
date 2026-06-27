import { JobIR35Signal, WorkMode } from '@outside-ir35-jobs/db/types';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HIDDEN_SIGNALS,
  hasActiveFilters,
  normalizeFilters,
  OUTSIDE_SIGNALS,
} from './filters';

describe('normalizeFilters', () => {
  it('returns empty defaults for empty params', () => {
    const f = normalizeFilters({});
    expect(f).toEqual({
      q: '',
      location: null,
      ir35Outside: false,
      ir35OutsideOnly: true,
      workMode: null,
      minRate: null,
      postedSinceDays: null,
    });
    // The default (outside-only) is not a user-applied constraint.
    expect(hasActiveFilters(f)).toBe(false);
  });

  it('trims query + location', () => {
    const f = normalizeFilters({ q: '  react  ', location: ' London ' });
    expect(f.q).toBe('react');
    expect(f.location).toBe('London');
  });

  it('parses a positive rate floor, rejects junk/zero', () => {
    expect(normalizeFilters({ minRate: '500' }).minRate).toBe(500);
    expect(normalizeFilters({ minRate: '0' }).minRate).toBeNull();
    expect(normalizeFilters({ minRate: 'abc' }).minRate).toBeNull();
  });

  it('accepts valid work modes, rejects others', () => {
    expect(normalizeFilters({ mode: 'REMOTE' }).workMode).toBe(WorkMode.REMOTE);
    expect(normalizeFilters({ mode: 'remote' }).workMode).toBeNull(); // case-sensitive enum
    expect(normalizeFilters({ mode: 'BOGUS' }).workMode).toBeNull();
  });

  it('maps posted windows to days', () => {
    expect(normalizeFilters({ posted: '24h' }).postedSinceDays).toBe(1);
    expect(normalizeFilters({ posted: 'week' }).postedSinceDays).toBe(7);
    expect(normalizeFilters({ posted: 'month' }).postedSinceDays).toBe(30);
    expect(normalizeFilters({ posted: 'nonsense' }).postedSinceDays).toBeNull();
  });

  it('sets ir35Outside only for "outside"', () => {
    expect(normalizeFilters({ ir35: 'outside' }).ir35Outside).toBe(true);
    // 'any' is no longer a thing — it's not strict-outside.
    expect(normalizeFilters({ ir35: 'any' }).ir35Outside).toBe(false);
  });

  it('ALWAYS outside-only — board requires an outside-leaning signal', () => {
    // default board (no param): outside-only — INSIDE *and* UNKNOWN both hidden.
    expect(normalizeFilters({}).ir35OutsideOnly).toBe(true);
    // strict outside is outside-only too.
    expect(normalizeFilters({ ir35: 'outside' }).ir35OutsideOnly).toBe(true);
    // a leftover/hand-crafted ?ir35=any can NO LONGER surface inside or unknown.
    expect(normalizeFilters({ ir35: 'any' }).ir35OutsideOnly).toBe(true);
  });

  it('hasActiveFilters detects any constraint', () => {
    expect(hasActiveFilters(normalizeFilters({ minRate: '400' }))).toBe(true);
    expect(hasActiveFilters(normalizeFilters({ mode: 'HYBRID' }))).toBe(true);
    expect(hasActiveFilters(normalizeFilters({ q: 'react' }))).toBe(false); // q isn't a filter
  });
});

describe('OUTSIDE_SIGNALS', () => {
  it('is the outside-leaning set, excluding UNKNOWN + INSIDE', () => {
    expect(OUTSIDE_SIGNALS).toContain(JobIR35Signal.CLIENT_INTENDS_OUTSIDE);
    expect(OUTSIDE_SIGNALS).toContain(JobIR35Signal.SDS_ISSUED);
    expect(OUTSIDE_SIGNALS).not.toContain(JobIR35Signal.UNKNOWN);
    expect(OUTSIDE_SIGNALS).not.toContain(JobIR35Signal.INSIDE);
  });
});

describe('DEFAULT_HIDDEN_SIGNALS', () => {
  it('hard-hides only INSIDE from the default board', () => {
    expect(DEFAULT_HIDDEN_SIGNALS).toEqual([JobIR35Signal.INSIDE]);
    // UNKNOWN is the bulk of aggregated work — it must NOT be hidden by default.
    expect(DEFAULT_HIDDEN_SIGNALS).not.toContain(JobIR35Signal.UNKNOWN);
  });
});
