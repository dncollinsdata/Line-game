import { CellIndex } from './types';
import { Rng } from './rng';

/**
 * Checkpoints are stored as positions along the solution path (sorted,
 * always including 0 and path.length - 1). Converting positions to cell
 * indices gives the puzzle's checkpoint list in ascending order for free.
 */
export function positionsToCheckpoints(path: CellIndex[], positions: number[]): CellIndex[] {
  return positions.map((p) => path[p]);
}

/** Endpoints plus `intermediate` evenly spread positions along the path. */
export function initialPositions(pathLength: number, intermediate: number): number[] {
  const positions = new Set<number>([0, pathLength - 1]);
  for (let i = 1; i <= intermediate; i++) {
    positions.add(Math.round((i * (pathLength - 1)) / (intermediate + 1)));
  }
  return Array.from(positions).sort((a, b) => a - b);
}

/**
 * Pick a new checkpoint position on `path` that rules out `other`, a competing
 * solution.
 *
 * A checkpoint at position p (between existing checkpoints at a < p < b) forces
 * the cell path[p] to be visited after path[a] and before path[b]. `other`
 * survives only if it already visits path[p] inside that window. So any free p
 * where `other` visits path[p] outside the window is guaranteed to kill it.
 * One of those is picked at random. If none exists (only possible when `other`
 * is missing, e.g. the solver aborted), any free position is picked.
 */
export function pickDisambiguatingPosition(
  path: CellIndex[],
  positions: number[],
  other: CellIndex[] | undefined,
  rng: Rng,
): number {
  const taken = new Set(positions);
  const free: number[] = [];
  for (let p = 0; p < path.length; p++) if (!taken.has(p)) free.push(p);

  if (other) {
    const otherPos = new Map<CellIndex, number>();
    other.forEach((cell, i) => otherPos.set(cell, i));
    const kills: number[] = [];
    let slot = 0;
    for (const p of free) {
      while (positions[slot + 1] < p) slot++;
      const windowStart = otherPos.get(path[positions[slot]]) as number;
      const windowEnd = otherPos.get(path[positions[slot + 1]]) as number;
      const t = otherPos.get(path[p]) as number;
      if (t < windowStart || t > windowEnd) kills.push(p);
    }
    if (kills.length > 0) return kills[rng.int(kills.length)];
  }
  return free[rng.int(free.length)];
}
