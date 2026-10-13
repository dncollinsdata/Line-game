import { solve } from '../solver';
import { generatePuzzle } from '../generate';
import packJson from '../../levels/pack.json';

interface Level {
  id: number;
  size: number;
  seed: number;
  checkpoints: number[];
  difficulty: number;
}
const levels = (packJson as { levels: Level[] }).levels;

describe('levels/pack.json', () => {
  it('has 20 levels numbered 1 to 20 in the required size bands', () => {
    expect(levels.map((l) => l.id)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(levels.slice(0, 5).every((l) => l.size === 5)).toBe(true);
    expect(levels.slice(5, 14).every((l) => l.size === 6)).toBe(true);
    expect(levels.slice(14, 20).every((l) => l.size === 7)).toBe(true);
  });

  it('is ordered by difficulty inside each band', () => {
    for (let i = 1; i < levels.length; i++) {
      if (levels[i].size === levels[i - 1].size) {
        expect(levels[i].difficulty).toBeGreaterThanOrEqual(levels[i - 1].difficulty);
      }
    }
  });

  it('every level has exactly one solution', () => {
    for (const level of levels) {
      const result = solve(level, { maxSolutions: 2 });
      expect(result.aborted).toBe(false);
      expect(result.solutions).toHaveLength(1);
    }
  });

  it('matches what the generator produces for each seed', () => {
    for (const level of levels) {
      const generated = generatePuzzle(level.size, level.seed);
      expect(generated.checkpoints).toEqual(level.checkpoints);
      expect(generated.difficulty).toBe(level.difficulty);
    }
  });
});
