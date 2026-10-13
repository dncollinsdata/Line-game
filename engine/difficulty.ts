/**
 * A rough difficulty score. It only needs to rank puzzles sensibly.
 *
 * Three ingredients:
 *  - grid size: more cells, more to plan.
 *  - guidance: the average number of cells between consecutive checkpoints.
 *    Long unguided stretches are harder than short ones.
 *  - solver effort: how many nodes the pruned DFS needed to find the solution
 *    and prove it unique. Log-scaled so one hard puzzle does not swamp the range.
 */
export function difficultyScore(size: number, checkpointCount: number, solverNodes: number): number {
  const cells = size * size;
  const segmentLength = cells / Math.max(1, checkpointCount - 1);
  const gridTerm = cells;
  const guidanceTerm = 3 * segmentLength;
  const effortTerm = 8 * Math.log2(1 + solverNodes);
  return Math.round(gridTerm + guidanceTerm + effortTerm);
}
