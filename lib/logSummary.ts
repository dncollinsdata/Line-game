import type { GameEvent } from './eventLog';

/**
 * The section 8 metrics, computed from an exported event log. Pure TypeScript
 * so the same code runs in the summarise script and in tests.
 *
 * A level_start with no later level_complete or level_abandon for the same
 * level counts as an abandon: the tester left by killing or backgrounding the
 * app, which logs nothing.
 */

export interface LevelOutcome {
  level: number;
  size: number;
  outcome: 'complete' | 'abandon' | 'abandon_implicit';
  seconds: number | null;
  steps_removed: number | null;
  resets: number | null;
  percent_filled: number | null;
}

export interface LogSummary {
  levelsCompleted: number;
  /** Highest level id with a level_complete. */
  highestCompleted: number;
  reachedTenLevels: boolean;
  /** Abandons (explicit or implicit) per level id. */
  abandonsByLevel: Record<number, number>;
  /** Median seconds per completed level, by grid size. */
  medianSecondsBySize: Record<number, number>;
  outcomes: LevelOutcome[];
}

export function summarizeLog(events: GameEvent[], sizeOfLevel: (level: number) => number): LogSummary {
  const outcomes: LevelOutcome[] = [];
  // Walk in order: each start opens an attempt, the next terminal event for the same level closes it.
  const open = new Map<number, number>(); // level -> index in outcomes
  for (const event of events) {
    if (event.type === 'level_start') {
      const existing = open.get(event.level);
      if (existing !== undefined) outcomes[existing].outcome = 'abandon_implicit';
      open.set(event.level, outcomes.length);
      outcomes.push({
        level: event.level,
        size: sizeOfLevel(event.level),
        outcome: 'abandon_implicit',
        seconds: null,
        steps_removed: null,
        resets: null,
        percent_filled: null,
      });
      continue;
    }
    const index = open.get(event.level);
    if (index === undefined) continue; // terminal event without a start: ignore
    const attempt = outcomes[index];
    if (event.type === 'level_complete') {
      attempt.outcome = 'complete';
      attempt.seconds = event.seconds;
      attempt.steps_removed = event.steps_removed;
      attempt.resets = event.resets;
      attempt.percent_filled = 100;
    } else {
      attempt.outcome = 'abandon';
      attempt.seconds = event.seconds;
      attempt.percent_filled = event.percent_filled;
    }
    open.delete(event.level);
  }

  const completedLevels = new Set(outcomes.filter((o) => o.outcome === 'complete').map((o) => o.level));
  const abandonsByLevel: Record<number, number> = {};
  for (const o of outcomes) {
    if (o.outcome === 'complete') continue;
    abandonsByLevel[o.level] = (abandonsByLevel[o.level] ?? 0) + 1;
  }

  const secondsBySize = new Map<number, number[]>();
  for (const o of outcomes) {
    if (o.outcome !== 'complete' || o.seconds === null) continue;
    const list = secondsBySize.get(o.size) ?? [];
    list.push(o.seconds);
    secondsBySize.set(o.size, list);
  }
  const medianSecondsBySize: Record<number, number> = {};
  for (const [size, list] of secondsBySize) medianSecondsBySize[size] = median(list);

  return {
    levelsCompleted: completedLevels.size,
    highestCompleted: completedLevels.size === 0 ? 0 : Math.max(...completedLevels),
    reachedTenLevels: completedLevels.size >= 10,
    abandonsByLevel,
    medianSecondsBySize,
    outcomes,
  };
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function formatSummary(summary: LogSummary): string {
  const lines: string[] = [];
  lines.push(`Levels completed: ${summary.levelsCompleted} (highest: ${summary.highestCompleted})`);
  lines.push(`Reached 10 levels: ${summary.reachedTenLevels ? 'yes' : 'no'}`);
  lines.push('Median seconds per completed level by size:');
  for (const size of Object.keys(summary.medianSecondsBySize).map(Number).sort((a, b) => a - b)) {
    lines.push(`  ${size}x${size}: ${summary.medianSecondsBySize[size]}`);
  }
  lines.push('Abandons by level:');
  const abandonLevels = Object.keys(summary.abandonsByLevel).map(Number).sort((a, b) => a - b);
  if (abandonLevels.length === 0) lines.push('  none');
  for (const level of abandonLevels) lines.push(`  level ${level}: ${summary.abandonsByLevel[level]}`);
  lines.push('Attempts:');
  for (const o of summary.outcomes) {
    const extra =
      o.outcome === 'complete'
        ? `${o.seconds}s, ${o.steps_removed} steps removed, ${o.resets} resets`
        : o.outcome === 'abandon'
          ? `${o.seconds}s, ${o.percent_filled}% filled`
          : 'no end event (app closed?)';
    lines.push(`  level ${o.level} (${o.size}x${o.size}): ${o.outcome}, ${extra}`);
  }
  return lines.join('\n');
}
