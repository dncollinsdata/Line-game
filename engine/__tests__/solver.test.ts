import { isUnique, solve } from '../solver';
import { Puzzle, toIndex } from '../types';

/**
 * Build a puzzle from an ASCII picture. Digits/letters are checkpoints in
 * order 1..9 then A..Z; dots are empty cells.
 */
function fromAscii(rows: string[]): Puzzle {
  const size = rows.length;
  const found: { n: number; cell: number }[] = [];
  rows.forEach((row, r) => {
    const cols = row.trim().split(/\s+/);
    expect(cols).toHaveLength(size);
    cols.forEach((ch, c) => {
      if (ch === '.') return;
      const n = /\d/.test(ch) ? parseInt(ch, 10) : ch.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
      found.push({ n, cell: toIndex(size, r, c) });
    });
  });
  found.sort((a, b) => a.n - b.n);
  return { size, checkpoints: found.map((f) => f.cell) };
}

describe('solve', () => {
  it('finds exactly one solution on a 2x2 with fixed endpoints', () => {
    // 1 .
    // . 2    -> both routes from 1 to 2 leave a cell unfilled, so 0 solutions.
    const none = fromAscii(['1 .', '. 2']);
    expect(solve(none).solutions).toHaveLength(0);

    // 1 2
    // . .    -> 1 down, right, up to 2. Unique.
    const one = fromAscii(['1 2', '. .']);
    const result = solve(one);
    expect(result.solutions).toHaveLength(1);
    expect(result.solutions[0]).toEqual([0, 2, 3, 1]);
  });

  it('reports 2+ solutions on an ambiguous 3x3', () => {
    // 1 . .
    // . . .
    // . . 2   -> corner to opposite corner on 3x3: two mirror-image solutions.
    const puzzle = fromAscii(['1 . .', '. . .', '. . 2']);
    const result = solve(puzzle, { maxSolutions: 10 });
    expect(result.solutions.length).toBe(2);
    expect(isUnique(puzzle)).toBe(false);
  });

  it('stops at 2 solutions by default', () => {
    // 1 at a corner, 2 on the far side of a 4x4 (opposite colour, so paths exist): many of them.
    const puzzle = fromAscii(['1 . . .', '. . . .', '. . . .', '. . 2 .']);
    const result = solve(puzzle);
    expect(result.solutions).toHaveLength(2);
    expect(result.aborted).toBe(false);
  });

  it('reports exactly 1 solution on a hand-built 3x3', () => {
    // 1 . 3
    // . 2 .
    // . . .   -> checked against the brute-force oracle below.
    const puzzle = fromAscii(['1 . 3', '. 2 .', '. . .']);
    const result = solve(puzzle, { maxSolutions: 100 });
    expect(result.solutions.length).toBe(bruteForceCount(puzzle));
  });

  it('enforces checkpoint order', () => {
    // 1 . .
    // 3 . .
    // 2 . .   -> from 1 you cannot go down (3 before 2), must go right first.
    const puzzle = fromAscii(['1 . .', '3 . .', '2 . .']);
    const result = solve(puzzle, { maxSolutions: 100 });
    for (const sol of result.solutions) {
      expect(sol.indexOf(puzzle.checkpoints[1])).toBeLessThan(sol.indexOf(puzzle.checkpoints[2]));
      expect(sol[sol.length - 1]).toBe(puzzle.checkpoints[2]);
    }
    expect(result.solutions.length).toBe(bruteForceCount(puzzle));
  });

  it('returns 0 solutions when the last checkpoint is not the final cell', () => {
    // 1 2 .
    // . . .
    // . . .   -> 2 is adjacent to 1 and must be the final cell, impossible to fill all first.
    const puzzle = fromAscii(['1 2 .', '. . .', '. . .']);
    expect(solve(puzzle).solutions).toHaveLength(0);
  });

  it('matches brute force counts on random 4x4 checkpoint layouts', () => {
    // Pruning must never change the count, only the speed.
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let trial = 0; trial < 30; trial++) {
      const cells = Array.from({ length: 16 }, (_, i) => i).sort(() => rand() - 0.5);
      const k = 2 + Math.floor(rand() * 3);
      const puzzle: Puzzle = { size: 4, checkpoints: cells.slice(0, k) };
      const result = solve(puzzle, { maxSolutions: 1000 });
      expect(result.aborted).toBe(false);
      expect(result.solutions.length).toBe(bruteForceCount(puzzle));
    }
  });

  it('respects nodeLimit and reports aborted', () => {
    const puzzle = fromAscii(['1 . . .', '. . . .', '. . . .', '. . 2 .']);
    const result = solve(puzzle, { maxSolutions: 1000, nodeLimit: 5 });
    expect(result.aborted).toBe(true);
  });
});

/** Unpruned exhaustive search used as an oracle for the pruned solver. */
function bruteForceCount(puzzle: Puzzle): number {
  const { size, checkpoints } = puzzle;
  const cells = size * size;
  const cpAt = new Map<number, number>();
  checkpoints.forEach((c, i) => cpAt.set(c, i + 1));
  const visited = new Set<number>();
  let count = 0;
  const walk = (head: number, next: number, remaining: number) => {
    if (remaining === 0) {
      if (head === checkpoints[checkpoints.length - 1]) count++;
      return;
    }
    const r = Math.floor(head / size);
    const c = head % size;
    const moves = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of moves) {
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const cell = nr * size + nc;
      if (visited.has(cell)) continue;
      const cp = cpAt.get(cell) ?? 0;
      if (cp !== 0 && cp !== next) continue;
      if (cp === checkpoints.length && remaining !== 1) continue;
      visited.add(cell);
      walk(cell, cp === next ? next + 1 : next, remaining - 1);
      visited.delete(cell);
    }
  };
  visited.add(checkpoints[0]);
  walk(checkpoints[0], 2, cells - 1);
  return count;
}
