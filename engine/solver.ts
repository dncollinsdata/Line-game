import { CellIndex, Puzzle, neighbors } from './types';

export interface SolveOptions {
  /** Stop after finding this many solutions. Default 2 (enough to test uniqueness). */
  maxSolutions?: number;
  /** Abort after expanding this many search nodes. Default 2 million. */
  nodeLimit?: number;
}

export interface SolveResult {
  /** Solutions found, each a full path of cell indices. Length is capped by maxSolutions. */
  solutions: CellIndex[][];
  /** Search nodes expanded. */
  nodes: number;
  /** True if the search gave up because nodeLimit was hit; the count is then a lower bound. */
  aborted: boolean;
}

/**
 * Depth-first search over paths that start at checkpoint 1, step orthogonally,
 * never reuse a cell, visit checkpoints in order, and end on the last checkpoint
 * having filled every cell.
 *
 * Pruning at every node:
 *  1. All unvisited cells must be reachable from the head.
 *  2. The next checkpoint must be reachable without crossing a later checkpoint.
 *  3. No unvisited cell may be a dead end (fewer than 2 open neighbours,
 *     counting the head), except the final checkpoint, which may have 1.
 */
export function solve(puzzle: Puzzle, options: SolveOptions = {}): SolveResult {
  const maxSolutions = options.maxSolutions ?? 2;
  const nodeLimit = options.nodeLimit ?? 2_000_000;
  const { size, checkpoints } = puzzle;
  const cells = size * size;

  // checkpointAt[cell] = 1-based checkpoint number, or 0 if none.
  const checkpointAt = new Int32Array(cells);
  checkpoints.forEach((cell, i) => {
    checkpointAt[cell] = i + 1;
  });
  const lastCheckpoint = checkpoints.length;
  const lastCell = checkpoints[lastCheckpoint - 1];

  const adjacency: CellIndex[][] = [];
  for (let i = 0; i < cells; i++) adjacency.push(neighbors(size, i));

  const visited = new Uint8Array(cells);
  const path: CellIndex[] = [];
  const solutions: CellIndex[][] = [];
  let nodes = 0;
  let aborted = false;

  // Scratch buffers for flood fill.
  const mark = new Uint8Array(cells);
  const stack = new Int32Array(cells);

  /**
   * Flood fill from `start` over unvisited cells, optionally treating checkpoints
   * numbered above `maxCheckpoint` as walls. Returns the number of cells reached
   * (not counting `start` itself, which is the visited head).
   */
  function flood(start: CellIndex, maxCheckpoint: number): number {
    mark.fill(0);
    let top = 0;
    let count = 0;
    stack[top++] = start;
    mark[start] = 1;
    while (top > 0) {
      const cell = stack[--top];
      const adj = adjacency[cell];
      for (let i = 0; i < adj.length; i++) {
        const next = adj[i];
        if (visited[next] || mark[next]) continue;
        if (checkpointAt[next] > maxCheckpoint) continue;
        mark[next] = 1;
        count++;
        stack[top++] = next;
      }
    }
    return count;
  }

  function canContinue(head: CellIndex, nextCheckpoint: number, remaining: number): boolean {
    // 1. Every unvisited cell must be reachable from the head.
    if (flood(head, Infinity) !== remaining) return false;

    // 2. The next checkpoint must be reachable without passing a later one.
    flood(head, nextCheckpoint);
    if (!mark[checkpoints[nextCheckpoint - 1]]) return false;

    // 3. Dead-end check.
    for (let cell = 0; cell < cells; cell++) {
      if (visited[cell]) continue;
      let degree = 0;
      const adj = adjacency[cell];
      for (let i = 0; i < adj.length; i++) {
        const n = adj[i];
        if (!visited[n] || n === head) degree++;
      }
      if (degree === 0) return false;
      if (degree === 1 && cell !== lastCell) return false;
    }
    return true;
  }

  function dfs(head: CellIndex, nextCheckpoint: number, remaining: number): void {
    if (aborted || solutions.length >= maxSolutions) return;
    nodes++;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }

    if (remaining === 0) {
      if (head === lastCell) solutions.push(path.slice());
      return;
    }

    if (!canContinue(head, nextCheckpoint, remaining)) return;

    const adj = adjacency[head];
    for (let i = 0; i < adj.length; i++) {
      const next = adj[i];
      if (visited[next]) continue;
      const cp = checkpointAt[next];
      if (cp !== 0) {
        if (cp !== nextCheckpoint) continue;
        // The last checkpoint may only be entered as the final cell.
        if (cp === lastCheckpoint && remaining !== 1) continue;
      }
      visited[next] = 1;
      path.push(next);
      dfs(next, cp === nextCheckpoint ? nextCheckpoint + 1 : nextCheckpoint, remaining - 1);
      path.pop();
      visited[next] = 0;
      if (aborted || solutions.length >= maxSolutions) return;
    }
  }

  if (checkpoints.length < 2 || lastCell === checkpoints[0]) {
    return { solutions: [], nodes: 0, aborted: false };
  }

  const start = checkpoints[0];
  visited[start] = 1;
  path.push(start);
  dfs(start, 2, cells - 1);

  return { solutions, nodes, aborted };
}

/** Convenience: true if the puzzle has exactly one solution. */
export function isUnique(puzzle: Puzzle, options: SolveOptions = {}): boolean {
  const result = solve(puzzle, { ...options, maxSolutions: 2 });
  return !result.aborted && result.solutions.length === 1;
}
