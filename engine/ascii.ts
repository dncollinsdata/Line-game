import { CellIndex, Puzzle } from './types';

/** Render a puzzle as text. Checkpoints show their number, other cells show a dot. */
export function puzzleToAscii(puzzle: Puzzle): string {
  const { size, checkpoints } = puzzle;
  const label = new Map<CellIndex, number>();
  checkpoints.forEach((cell, i) => label.set(cell, i + 1));
  const width = String(checkpoints.length).length;
  const lines: string[] = [];
  for (let row = 0; row < size; row++) {
    const parts: string[] = [];
    for (let col = 0; col < size; col++) {
      const n = label.get(row * size + col);
      parts.push((n === undefined ? '.' : String(n)).padStart(width));
    }
    lines.push(parts.join(' '));
  }
  return lines.join('\n');
}

/** Render a solution path as text: each cell shows its 0-based step number. */
export function pathToAscii(size: number, path: CellIndex[]): string {
  const step = new Map<CellIndex, number>();
  path.forEach((cell, i) => step.set(cell, i));
  const width = String(path.length - 1).length;
  const lines: string[] = [];
  for (let row = 0; row < size; row++) {
    const parts: string[] = [];
    for (let col = 0; col < size; col++) {
      const s = step.get(row * size + col);
      parts.push((s === undefined ? '?' : String(s)).padStart(width));
    }
    lines.push(parts.join(' '));
  }
  return lines.join('\n');
}
