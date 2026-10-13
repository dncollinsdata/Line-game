import { generatePuzzle } from '../generate';
import { isHamiltonianPath } from '../pathGenerator';
import { solve } from '../solver';
import { difficultyScore } from '../difficulty';

describe('generatePuzzle', () => {
  it('produces puzzles with exactly one solution, equal to the generated path', () => {
    for (const size of [4, 5, 6]) {
      for (let seed = 1; seed <= 10; seed++) {
        const puzzle = generatePuzzle(size, seed);
        expect(isHamiltonianPath(size, puzzle.solution)).toBe(true);
        const result = solve(puzzle, { maxSolutions: 2 });
        expect(result.aborted).toBe(false);
        expect(result.solutions).toHaveLength(1);
        expect(result.solutions[0]).toEqual(puzzle.solution);
      }
    }
  });

  it('places checkpoint 1 on the first cell and K on the last cell of the path', () => {
    const puzzle = generatePuzzle(6, 3);
    expect(puzzle.checkpoints[0]).toBe(puzzle.solution[0]);
    expect(puzzle.checkpoints[puzzle.checkpoints.length - 1]).toBe(puzzle.solution[puzzle.solution.length - 1]);
  });

  it('lists checkpoints in path order', () => {
    const puzzle = generatePuzzle(7, 11);
    const order = puzzle.checkpoints.map((c) => puzzle.solution.indexOf(c));
    for (let i = 1; i < order.length; i++) expect(order[i]).toBeGreaterThan(order[i - 1]);
  });

  it('gives identical output for the same seed', () => {
    expect(generatePuzzle(7, 2024)).toEqual(generatePuzzle(7, 2024));
    expect(generatePuzzle(7, 2024).checkpoints).not.toEqual(generatePuzzle(7, 2025).checkpoints);
  });

  it('generates a 7x7 puzzle in under 2 seconds', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const start = Date.now();
      generatePuzzle(7, seed);
      expect(Date.now() - start).toBeLessThan(2000);
    }
  });
});

describe('difficultyScore', () => {
  it('rises with grid size, falls with more checkpoints, rises with solver effort', () => {
    expect(difficultyScore(7, 8, 100)).toBeGreaterThan(difficultyScore(5, 8, 100));
    expect(difficultyScore(6, 6, 100)).toBeGreaterThan(difficultyScore(6, 12, 100));
    expect(difficultyScore(6, 8, 5000)).toBeGreaterThan(difficultyScore(6, 8, 100));
  });
});
