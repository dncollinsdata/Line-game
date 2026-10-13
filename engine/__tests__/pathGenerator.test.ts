import { createRng } from '../rng';
import { generateFullPath, isHamiltonianPath, zigzagPath } from '../pathGenerator';

describe('zigzagPath', () => {
  it('visits every cell once with orthogonal moves', () => {
    for (const size of [2, 3, 5, 7]) expect(isHamiltonianPath(size, zigzagPath(size))).toBe(true);
  });
});

describe('generateFullPath', () => {
  it('visits every cell exactly once and only moves orthogonally', () => {
    for (const size of [3, 4, 5, 6, 7, 8]) {
      for (let seed = 1; seed <= 20; seed++) {
        const path = generateFullPath(size, createRng(seed));
        expect(isHamiltonianPath(size, path)).toBe(true);
      }
    }
  });

  it('is deterministic for the same seed', () => {
    expect(generateFullPath(6, createRng(99))).toEqual(generateFullPath(6, createRng(99)));
  });

  it('produces different shapes for different seeds', () => {
    const a = generateFullPath(6, createRng(1));
    const b = generateFullPath(6, createRng(2));
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(zigzagPath(6));
  });
});

describe('isHamiltonianPath', () => {
  it('rejects paths with repeats, gaps, or diagonal steps', () => {
    expect(isHamiltonianPath(2, [0, 1, 3, 2])).toBe(true);
    expect(isHamiltonianPath(2, [0, 1, 3])).toBe(false); // missing a cell
    expect(isHamiltonianPath(2, [0, 1, 1, 2])).toBe(false); // repeat
    expect(isHamiltonianPath(2, [0, 3, 1, 2])).toBe(false); // diagonal
  });
});
