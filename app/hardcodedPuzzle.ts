import { Puzzle } from '../engine/types';

/**
 * Phase 2 test puzzle: 7x7, generated from seed 42.
 *
 *  .  . 10  .  .  .  .
 *  .  .  .  .  .  .  .
 *  .  7  .  .  6  9  .
 *  .  1  .  .  .  4  .
 *  .  .  2  .  5  .  8
 *  .  3  .  .  .  .  .
 *  .  .  .  .  .  .  .
 */
export const HARDCODED_PUZZLE: Puzzle = {
  size: 7,
  checkpoints: [22, 30, 36, 26, 32, 18, 15, 34, 19, 2],
};
