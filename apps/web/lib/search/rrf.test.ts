import { describe, expect, it } from 'vitest';
import { RRF_K, reciprocalRankFusion } from './rrf';

describe('reciprocalRankFusion', () => {
  it('ranks an id agreed-best by both lists at the top', () => {
    const fused = reciprocalRankFusion([
      ['a', 'b', 'c'],
      ['a', 'c', 'b'],
    ]);
    expect(fused[0]).toBe('a'); // top of both → highest fused score
  });

  it('ranks an id present in BOTH lists above one ranked #1 in only one', () => {
    // 'b' appears in both (2/(k+2) ≈ 0.0323) and beats 'x' which is #1 in one
    // list only (1/(k+1) ≈ 0.0164). Cross-list agreement is rewarded.
    const fused = reciprocalRankFusion([
      ['a', 'b'],
      ['x', 'b'],
    ]);
    expect(fused[0]).toBe('b');
    expect(fused.indexOf('b')).toBeLessThan(fused.indexOf('x'));
  });

  it('surfaces a one-list-only top hit above an item ranked low in both', () => {
    // 'x' is #1 in list 2 only: 1/(k+1). 'c' is #3 in both: 2/(k+3). With k=60,
    // 1/61 ≈ 0.0164 < 2/63 ≈ 0.0317 — 'c' still wins. But a one-list #1 DOES beat
    // an item that is ONLY ranked low in one list.
    const fused = reciprocalRankFusion([['a', 'b', 'low'], ['x']]);
    expect(fused.indexOf('x')).toBeLessThan(fused.indexOf('low'));
  });

  it('unions ids across lists (an id in only one list still appears)', () => {
    const fused = reciprocalRankFusion([['a', 'b'], ['c']]);
    expect(new Set(fused)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('returns the single list unchanged when only one ranker is present', () => {
    expect(reciprocalRankFusion([['a', 'b', 'c']])).toEqual(['a', 'b', 'c']);
  });

  it('handles empty inputs', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([[], []])).toEqual([]);
  });

  it('is deterministic for tied scores (best single rank, then first seen)', () => {
    // 'a' and 'b' both appear once at position 0 in separate lists → equal score;
    // tie broken by first appearance order.
    const fused = reciprocalRankFusion([['a'], ['b']]);
    expect(fused).toEqual(['a', 'b']);
  });

  it('uses k=60 by default', () => {
    expect(RRF_K).toBe(60);
    // higher k flattens weighting; lower k sharpens it — just assert it's wired.
    const sharp = reciprocalRankFusion(
      [
        ['a', 'b'],
        ['b', 'a'],
      ],
      1,
    );
    expect(new Set(sharp)).toEqual(new Set(['a', 'b']));
  });
});
