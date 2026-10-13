import { CellIndex, isAdjacent, neighbors, toIndex } from './types';
import { Rng } from './rng';

/** A boustrophedon (snake) path that visits every cell once. */
export function zigzagPath(size: number): CellIndex[] {
  const path: CellIndex[] = [];
  for (let row = 0; row < size; row++) {
    if (row % 2 === 0) {
      for (let col = 0; col < size; col++) path.push(toIndex(size, row, col));
    } else {
      for (let col = size - 1; col >= 0; col--) path.push(toIndex(size, row, col));
    }
  }
  return path;
}

/**
 * One "backbite" move (Mansfield, 1982) applied to the tail of the path.
 *
 * Pick a neighbour of the last cell that is already on the path but is not
 * the second-to-last cell. Say it sits at position k. Reversing the segment
 * path[k+1 .. end] produces a different Hamiltonian path: the new tail is the
 * old path[k+1], which was adjacent to path[k].
 *
 * Returns true if a move was made.
 */
function backbiteTail(size: number, path: CellIndex[], rng: Rng): boolean {
  const n = path.length;
  const tail = path[n - 1];
  const candidates = neighbors(size, tail).filter((cell) => cell !== path[n - 2]);
  if (candidates.length === 0) return false;
  const target = candidates[rng.int(candidates.length)];
  const k = path.indexOf(target);
  // Reverse path[k+1 .. n-1] in place.
  let lo = k + 1;
  let hi = n - 1;
  while (lo < hi) {
    const tmp = path[lo];
    path[lo] = path[hi];
    path[hi] = tmp;
    lo++;
    hi--;
  }
  return true;
}

/**
 * Generate a random Hamiltonian path on a size x size grid by starting from a
 * zigzag and applying backbite moves to either end.
 */
export function generateFullPath(size: number, rng: Rng, moves?: number): CellIndex[] {
  const path = zigzagPath(size);
  const total = moves ?? size * size * 20;
  for (let i = 0; i < total; i++) {
    // Work on a random end: reversing the array swaps head and tail.
    if (rng.next() < 0.5) path.reverse();
    backbiteTail(size, path, rng);
  }
  return path;
}

/** True if the path visits every cell of the grid exactly once with orthogonal steps. */
export function isHamiltonianPath(size: number, path: CellIndex[]): boolean {
  const cells = size * size;
  if (path.length !== cells) return false;
  const seen = new Uint8Array(cells);
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (cell < 0 || cell >= cells || seen[cell]) return false;
    seen[cell] = 1;
    if (i > 0 && !isAdjacent(size, path[i - 1], cell)) return false;
  }
  return true;
}
