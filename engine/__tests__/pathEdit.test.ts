import { applyCell, canExtend, endedEarly, isLegalPath, isSolved, nextCheckpoint } from '../pathEdit';
import { Puzzle } from '../types';
import { generatePuzzle } from '../generate';

// 1 . 3
// . 2 .
// . . .    (3x3, cell index = row * 3 + col)
const puzzle: Puzzle = { size: 3, checkpoints: [0, 4, 2] };

describe('applyCell', () => {
  it('starts only on checkpoint 1', () => {
    expect(applyCell(puzzle, [], 1)).toEqual([]);
    expect(applyCell(puzzle, [], 0)).toEqual([0]);
  });

  it('extends into an adjacent empty cell and ignores non-adjacent ones', () => {
    expect(applyCell(puzzle, [0], 3)).toEqual([0, 3]);
    expect(applyCell(puzzle, [0], 8)).toEqual([0]);
  });

  it('ignores diagonal moves', () => {
    expect(applyCell(puzzle, [0], 4)).toEqual([0]);
  });

  it('removes the last step when dragging back onto the previous cell', () => {
    expect(applyCell(puzzle, [0, 3, 6], 3)).toEqual([0, 3]);
  });

  it('truncates to any earlier cell on the path', () => {
    expect(applyCell(puzzle, [0, 3, 6, 7], 0)).toEqual([0]);
  });

  it('returns the same instance when nothing changes', () => {
    const path = [0, 3];
    expect(applyCell(puzzle, path, 3)).toBe(path);
    expect(applyCell(puzzle, path, 8)).toBe(path);
  });

  it('blocks checkpoint n until n-1 is on the path', () => {
    // From 1 going right reaches 3 before 2: blocked.
    expect(applyCell(puzzle, [0, 1], 2)).toEqual([0, 1]);
    // From (1,0) the cell 4 is checkpoint 2, which is next: allowed.
    expect(applyCell(puzzle, [0, 3], 4)).toEqual([0, 3, 4]);
    // After 2, checkpoint 3 is allowed.
    expect(applyCell(puzzle, [0, 3, 4, 1], 2)).toEqual([0, 3, 4, 1, 2]);
  });

  it('does not extend past the last checkpoint', () => {
    expect(canExtend(puzzle, [0, 3, 4, 1, 2], 5)).toBe(false);
    expect(applyCell(puzzle, [0, 3, 4, 1, 2], 5)).toEqual([0, 3, 4, 1, 2]);
  });

  it('fills skipped cells on a straight drag', () => {
    expect(applyCell(puzzle, [0], 6)).toEqual([0, 3, 6]);
    expect(applyCell(puzzle, [0, 3, 6], 8)).toEqual([0, 3, 6, 7, 8]);
  });

  it('stops a straight fill at the first illegal step', () => {
    // Dragging from 1 straight right: 1 is empty, 2 is checkpoint 3 (blocked).
    expect(applyCell(puzzle, [0], 2)).toEqual([0, 1]);
  });

  it('does not fill across a cell already on the path', () => {
    // Head is 3; dragging to 5 in the same row would pass through 4, which is used.
    const path = [0, 1, 4, 3];
    expect(applyCell(puzzle, path, 5)).toBe(path);
  });
});

describe('nextCheckpoint', () => {
  it('counts checkpoints on the path', () => {
    expect(nextCheckpoint(puzzle, [])).toBe(1);
    expect(nextCheckpoint(puzzle, [0])).toBe(2);
    expect(nextCheckpoint(puzzle, [0, 3, 4])).toBe(3);
  });
});

describe('isSolved', () => {
  it('requires the grid to be full and the head on the last checkpoint', () => {
    expect(isSolved(puzzle, [0, 3, 6, 7, 8, 5, 4, 1, 2])).toBe(true);
    expect(isSolved(puzzle, [0, 3, 4, 1, 2])).toBe(false);
  });

  it('agrees with the generator: the solution path is solved and legal', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const generated = generatePuzzle(5, seed);
      expect(isLegalPath(generated, generated.solution)).toBe(true);
      expect(isSolved(generated, generated.solution)).toBe(true);
      let path: number[] = [];
      for (const cell of generated.solution) path = applyCell(generated, path, cell);
      expect(path).toEqual(generated.solution);
    }
  });
});

describe('endedEarly', () => {
  it('is true only when the head is on the last checkpoint with cells still empty', () => {
    expect(endedEarly(puzzle, [0, 3, 4, 1, 2])).toBe(true);
    expect(endedEarly(puzzle, [0, 3, 6, 7, 8, 5, 4, 1, 2])).toBe(false); // solved
    expect(endedEarly(puzzle, [0, 3, 4, 1])).toBe(false); // not on the last checkpoint
    expect(endedEarly(puzzle, [])).toBe(false);
  });
});

describe('isLegalPath', () => {
  it('rejects paths that break any rule', () => {
    expect(isLegalPath(puzzle, [1, 0])).toBe(false); // wrong start
    expect(isLegalPath(puzzle, [0, 4])).toBe(false); // diagonal
    expect(isLegalPath(puzzle, [0, 1, 2])).toBe(false); // checkpoint 3 before 2
    expect(isLegalPath(puzzle, [0, 3, 0])).toBe(false); // reuse
  });
});
