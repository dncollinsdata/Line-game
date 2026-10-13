import { CellIndex, Puzzle, isAdjacent } from './types';

/**
 * Rules for editing the player's path. Pure functions over (puzzle, path).
 * The UI calls `applyCell` for every cell the finger touches and renders
 * whatever comes back. It never decides legality itself.
 *
 * Rules:
 *  - The path starts only on checkpoint 1.
 *  - Touching a cell already on the path truncates the path to that cell.
 *    (Dragging back onto the previous cell is the one-step case of this.)
 *  - An empty cell orthogonally adjacent to the head extends the path.
 *  - Checkpoint n can only be entered once checkpoint n-1 is on the path.
 *  - Once the path reaches the last checkpoint it cannot be extended.
 *  - A cell in the same row or column as the head, further than one step,
 *    extends the path through the cells in between, as far as every step
 *    is legal. This covers fast drags that skip over cells.
 */

/** 1-based checkpoint number at `cell`, or 0 if it is not a checkpoint. */
export function checkpointNumber(puzzle: Puzzle, cell: CellIndex): number {
  return puzzle.checkpoints.indexOf(cell) + 1;
}

/** The number of the next checkpoint the path must reach (1 if the path is empty). */
export function nextCheckpoint(puzzle: Puzzle, path: CellIndex[]): number {
  let n = 0;
  for (const cell of path) {
    const cp = checkpointNumber(puzzle, cell);
    if (cp > n) n = cp;
  }
  return n + 1;
}

/** Can the path, as it stands, legally step onto `cell`? */
export function canExtend(puzzle: Puzzle, path: CellIndex[], cell: CellIndex): boolean {
  if (path.length === 0) return cell === puzzle.checkpoints[0];
  const head = path[path.length - 1];
  if (head === puzzle.checkpoints[puzzle.checkpoints.length - 1]) return false;
  if (!isAdjacent(puzzle.size, head, cell)) return false;
  if (path.includes(cell)) return false;
  const cp = checkpointNumber(puzzle, cell);
  return cp === 0 || cp === nextCheckpoint(puzzle, path);
}

/**
 * Apply a touch on `cell` to the path. Returns the new path, or the same
 * array instance if nothing changed.
 */
export function applyCell(puzzle: Puzzle, path: CellIndex[], cell: CellIndex): CellIndex[] {
  if (path.length === 0) {
    return cell === puzzle.checkpoints[0] ? [cell] : path;
  }

  const existing = path.indexOf(cell);
  if (existing !== -1) {
    return existing === path.length - 1 ? path : path.slice(0, existing + 1);
  }

  if (canExtend(puzzle, path, cell)) return [...path, cell];

  // Straight-line fill for skipped cells.
  const { size } = puzzle;
  const head = path[path.length - 1];
  const headRow = Math.floor(head / size);
  const headCol = head % size;
  const row = Math.floor(cell / size);
  const col = cell % size;
  if (headRow !== row && headCol !== col) return path;

  const step = headRow === row ? (col > headCol ? 1 : -1) : row > headRow ? size : -size;
  let next = path;
  for (let c = head + step; ; c += step) {
    if (!canExtend(puzzle, next, c)) break;
    next = [...next, c];
    if (c === cell) break;
  }
  return next;
}

/** True when the path fills the grid and ends on the last checkpoint. */
export function isSolved(puzzle: Puzzle, path: CellIndex[]): boolean {
  const cells = puzzle.size * puzzle.size;
  return path.length === cells && path[cells - 1] === puzzle.checkpoints[puzzle.checkpoints.length - 1];
}

/** True if the path obeys every rule: a defensive check the UI can assert on. */
export function isLegalPath(puzzle: Puzzle, path: CellIndex[]): boolean {
  let partial: CellIndex[] = [];
  for (const cell of path) {
    if (!canExtend(puzzle, partial, cell)) return false;
    partial = [...partial, cell];
  }
  return true;
}
