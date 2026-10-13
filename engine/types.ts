/**
 * Core puzzle types. Pure data, no React or React Native imports anywhere in /engine.
 *
 * Cells are addressed by a single index: `index = row * size + col`.
 * A path is an ordered list of cell indices.
 */

export type CellIndex = number;

export interface Puzzle {
  /** Grid is size x size. */
  size: number;
  /**
   * checkpoints[i] is the cell index of checkpoint number i + 1.
   * checkpoints[0] is where the path starts, the last entry is where it ends.
   */
  checkpoints: CellIndex[];
}

/** A puzzle together with the path it was generated from and its difficulty. */
export interface GeneratedPuzzle extends Puzzle {
  seed: number;
  solution: CellIndex[];
  difficulty: number;
  /** Nodes the solver expanded while proving uniqueness. Diagnostic only. */
  solverNodes: number;
}

export function toIndex(size: number, row: number, col: number): CellIndex {
  return row * size + col;
}

export function toRowCol(size: number, index: CellIndex): { row: number; col: number } {
  return { row: Math.floor(index / size), col: index % size };
}

export function isAdjacent(size: number, a: CellIndex, b: CellIndex): boolean {
  const ra = Math.floor(a / size);
  const ca = a % size;
  const rb = Math.floor(b / size);
  const cb = b % size;
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1;
}

/** Orthogonal neighbours of a cell, in a fixed order (up, right, down, left). */
export function neighbors(size: number, index: CellIndex): CellIndex[] {
  const row = Math.floor(index / size);
  const col = index % size;
  const out: CellIndex[] = [];
  if (row > 0) out.push(index - size);
  if (col < size - 1) out.push(index + 1);
  if (row < size - 1) out.push(index + size);
  if (col > 0) out.push(index - 1);
  return out;
}
