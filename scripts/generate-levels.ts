/**
 * Generates /levels/pack.json: 20 levels ordered by difficulty inside each
 * size band. Run with `npm run generate-levels`.
 *
 * For each size, a fixed set of seeds is generated and the puzzles are sorted
 * by difficulty score. Levels are then picked at evenly spaced quantiles
 * between the 10th and 85th percentile, so each band ramps up smoothly and
 * the rare outlier puzzle is left out. Every chosen level is re-verified
 * with the solver before it is written.
 */
import * as fs from 'fs';
import * as path from 'path';
import { generatePuzzle } from '../engine/generate';
import { solve } from '../engine/solver';
import { isLegalPath, isSolved } from '../engine/pathEdit';
import { puzzleToAscii } from '../engine/ascii';
import { GeneratedPuzzle } from '../engine/types';

interface Band {
  size: number;
  count: number;
}

const BANDS: Band[] = [
  { size: 5, count: 5 },
  { size: 6, count: 9 },
  { size: 7, count: 6 },
];
const CANDIDATES_PER_BAND = 60;
const LOW_QUANTILE = 0.1;
const HIGH_QUANTILE = 0.85;

export interface LevelDefinition {
  id: number;
  size: number;
  seed: number;
  checkpoints: number[];
  difficulty: number;
}

export interface LevelPack {
  version: number;
  levels: LevelDefinition[];
}

function pickBand(band: Band): GeneratedPuzzle[] {
  const candidates: GeneratedPuzzle[] = [];
  for (let i = 0; i < CANDIDATES_PER_BAND; i++) {
    candidates.push(generatePuzzle(band.size, band.size * 1000 + i));
  }
  candidates.sort((a, b) => a.difficulty - b.difficulty);
  const chosen: GeneratedPuzzle[] = [];
  for (let k = 0; k < band.count; k++) {
    const q = LOW_QUANTILE + ((HIGH_QUANTILE - LOW_QUANTILE) * k) / Math.max(1, band.count - 1);
    const index = Math.min(candidates.length - 1, Math.round(q * (candidates.length - 1)));
    chosen.push(candidates[index]);
  }
  return chosen;
}

function verify(puzzle: GeneratedPuzzle): void {
  const result = solve(puzzle, { maxSolutions: 2 });
  if (result.aborted || result.solutions.length !== 1) {
    throw new Error(`Puzzle ${puzzle.size}x${puzzle.size} seed ${puzzle.seed} is not unique`);
  }
  if (!isLegalPath(puzzle, puzzle.solution) || !isSolved(puzzle, puzzle.solution)) {
    throw new Error(`Puzzle ${puzzle.size}x${puzzle.size} seed ${puzzle.seed} has an invalid solution`);
  }
}

function main(): void {
  const levels: LevelDefinition[] = [];
  for (const band of BANDS) {
    for (const puzzle of pickBand(band)) {
      verify(puzzle);
      levels.push({
        id: levels.length + 1,
        size: puzzle.size,
        seed: puzzle.seed,
        checkpoints: puzzle.checkpoints,
        difficulty: puzzle.difficulty,
      });
    }
  }

  const pack: LevelPack = { version: 1, levels };
  // Resolved from the repo root, where `npm run generate-levels` runs.
  const outFile = path.join(process.cwd(), 'levels', 'pack.json');
  fs.writeFileSync(outFile, JSON.stringify(pack, null, 2) + '\n');

  for (const level of levels) {
    console.log(`Level ${level.id}: ${level.size}x${level.size} seed ${level.seed} K=${level.checkpoints.length} difficulty ${level.difficulty}`);
    console.log(puzzleToAscii(level));
    console.log('');
  }
  console.log(`Wrote ${levels.length} verified levels to ${outFile}`);
}

main();
