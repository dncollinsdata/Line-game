import { GameEvent } from '../eventLog';
import { formatSummary, median, summarizeLog } from '../logSummary';

const size = (level: number) => (level <= 5 ? 5 : level <= 14 ? 6 : 7);

describe('summarizeLog', () => {
  it('pairs starts with their end events and counts implicit abandons', () => {
    const events: GameEvent[] = [
      { type: 'level_start', level: 1, timestamp: 1 },
      { type: 'level_complete', level: 1, seconds: 20, steps_removed: 1, resets: 0, timestamp: 2 },
      { type: 'level_start', level: 2, timestamp: 3 },
      { type: 'level_abandon', level: 2, seconds: 9, percent_filled: 40, timestamp: 4 },
      { type: 'level_start', level: 2, timestamp: 5 },
      { type: 'level_complete', level: 2, seconds: 30, steps_removed: 4, resets: 1, timestamp: 6 },
      { type: 'level_start', level: 6, timestamp: 7 },
      { type: 'level_complete', level: 6, seconds: 50, steps_removed: 0, resets: 0, timestamp: 8 },
      { type: 'level_start', level: 7, timestamp: 9 }, // app closed, no end event
    ];
    const summary = summarizeLog(events, size);
    expect(summary.levelsCompleted).toBe(3);
    expect(summary.highestCompleted).toBe(6);
    expect(summary.reachedTenLevels).toBe(false);
    expect(summary.abandonsByLevel).toEqual({ 2: 1, 7: 1 });
    expect(summary.medianSecondsBySize).toEqual({ 5: 25, 6: 50 });
    expect(summary.outcomes.map((o) => o.outcome)).toEqual(['complete', 'abandon', 'complete', 'complete', 'abandon_implicit']);
    expect(formatSummary(summary)).toContain('level 7 (6x6): abandon_implicit');
  });

  it('ignores end events without a start', () => {
    const summary = summarizeLog([{ type: 'level_complete', level: 3, seconds: 1, steps_removed: 0, resets: 0, timestamp: 1 }], size);
    expect(summary.levelsCompleted).toBe(0);
    expect(summary.outcomes).toEqual([]);
  });
});

describe('median', () => {
  it('handles odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
