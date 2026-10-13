import { CellIndex, GeneratedPuzzle } from './types';
import { createRng, Rng } from './rng';
import { generateFullPath } from './pathGenerator';
import { initialPositions, pickDisambiguatingPosition, positionsToCheckpoints } from './checkpoints';
import { solve } from './solver';
import { difficultyScore } from './difficulty';

export interface GenerateOptions {
  /** Intermediate checkpoints to start with before the uniqueness loop. Default 0. */
  initialIntermediate?: number;
  /** Solver node budget per uniqueness check. Exceeding it counts as "not unique". */
  nodeLimit?: number;
  /** After reaching uniqueness, try removing each checkpoint that is not needed. Default true. */
  prune?: boolean;
}

/**
 * Generate a puzzle with exactly one solution.
 *
 * 1. Build a random full-grid path from the seed.
 * 2. Mark its endpoints as checkpoints 1 and K.
 * 3. Run the solver. While it finds a second solution, add a checkpoint on the
 *    intended path at a position that rules that solution out, and retry.
 * 4. Prune: try dropping each intermediate checkpoint in random order and keep
 *    the drop if the puzzle stays unique. This roughly halves the checkpoint
 *    count on larger grids.
 */
export function generatePuzzle(size: number, seed: number, options: GenerateOptions = {}): GeneratedPuzzle {
  const rng = createRng(seed);
  const path = generateFullPath(size, rng);
  const nodeLimit = options.nodeLimit ?? 300_000;

  let positions = initialPositions(path.length, options.initialIntermediate ?? 0);
  let nodes = 0;

  for (;;) {
    const checkpoints = positionsToCheckpoints(path, positions);
    const result = solve({ size, checkpoints }, { maxSolutions: 2, nodeLimit });
    if (!result.aborted && result.solutions.length === 1) {
      nodes = result.nodes;
      break;
    }
    if (!result.aborted && result.solutions.length === 0) {
      throw new Error(`Generated path is not a solution (seed ${seed}, size ${size})`);
    }
    if (positions.length >= path.length) {
      throw new Error(`Ran out of checkpoint positions (seed ${seed}, size ${size})`);
    }
    const other = result.solutions.find((s) => !samePath(s, path));
    const next = pickDisambiguatingPosition(path, positions, other, rng);
    positions = [...positions, next].sort((a, b) => a - b);
  }

  if (options.prune ?? true) {
    const pruned = pruneCheckpoints(size, path, positions, rng, nodeLimit);
    positions = pruned.positions;
    nodes = pruned.nodes;
  }

  const checkpoints = positionsToCheckpoints(path, positions);
  return {
    size,
    checkpoints,
    seed,
    solution: path,
    difficulty: difficultyScore(size, checkpoints.length, nodes),
    solverNodes: nodes,
  };
}

/** Drop intermediate checkpoints one at a time while the puzzle stays unique. */
function pruneCheckpoints(
  size: number,
  path: CellIndex[],
  positions: number[],
  rng: Rng,
  nodeLimit: number,
): { positions: number[]; nodes: number } {
  const order = positions.slice(1, -1);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    const tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
  }
  let current = positions;
  let nodes = 0;
  for (const p of order) {
    const trial = current.filter((q) => q !== p);
    const result = solve({ size, checkpoints: positionsToCheckpoints(path, trial) }, { maxSolutions: 2, nodeLimit });
    if (!result.aborted && result.solutions.length === 1) {
      current = trial;
      nodes = result.nodes;
    }
  }
  if (nodes === 0) {
    // Nothing was pruned; re-measure effort for the final layout.
    nodes = solve({ size, checkpoints: positionsToCheckpoints(path, current) }, { maxSolutions: 2, nodeLimit }).nodes;
  }
  return { positions: current, nodes };
}

function samePath(a: CellIndex[], b: CellIndex[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
