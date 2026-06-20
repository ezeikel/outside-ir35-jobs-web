/**
 * Reciprocal Rank Fusion (RRF) — fuse multiple ranked id lists into one.
 *
 * We rank jobs two ways for a query: pgvector cosine (semantic) and Postgres FTS
 * (lexical). Their scores aren't comparable (cosine distance vs ts_rank), so we
 * fuse by RANK position, not score: each list contributes 1/(k + position) to an
 * id's fused score, and we sort by the summed score. A job ranked well by EITHER
 * ranker surfaces; ranked well by BOTH rises to the top. `k` (default 60, the
 * value from the original RRF paper) dampens the contribution of low-rank items.
 *
 * Pure + unit-tested.
 */

export const RRF_K = 60;

/**
 * @param rankings  Each inner array is an ordered list of ids (best first).
 * @param k         RRF constant; larger = flatter weighting.
 * @returns ids ordered by fused score (best first). Ties broken by best single
 *          rank, then by first appearance, for determinism.
 */
export const reciprocalRankFusion = (
  rankings: string[][],
  k: number = RRF_K,
): string[] => {
  const score = new Map<string, number>();
  const bestRank = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  let order = 0;

  for (const list of rankings) {
    for (let pos = 0; pos < list.length; pos++) {
      const id = list[pos];
      score.set(id, (score.get(id) ?? 0) + 1 / (k + pos + 1));
      const prevBest = bestRank.get(id);
      if (prevBest === undefined || pos < prevBest) bestRank.set(id, pos);
      if (!firstSeen.has(id)) firstSeen.set(id, order++);
    }
  }

  return [...score.keys()].sort((a, b) => {
    const ds = (score.get(b) as number) - (score.get(a) as number);
    if (ds !== 0) return ds;
    const dr = (bestRank.get(a) as number) - (bestRank.get(b) as number);
    if (dr !== 0) return dr;
    return (firstSeen.get(a) as number) - (firstSeen.get(b) as number);
  });
};
