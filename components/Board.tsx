import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Puzzle } from '../engine/types';
import { applyCell, checkpointNumber, nextCheckpoint } from '../engine/pathEdit';
import { Cell, CheckpointLabel } from './Cell';
import { PathLayer } from './PathLayer';
import { cellAtPoint, makeLayout } from './layout';

interface BoardProps {
  puzzle: Puzzle;
  path: number[];
  /**
   * Called with an updater, like React's setState. Updaters are applied in
   * order even when several touch events arrive before the next render.
   */
  onPathChange: (update: (previous: number[]) => number[]) => void;
  /** Finger down on the board. */
  onStrokeStart?: () => void;
  /** Finger lifted or gesture cancelled. */
  onStrokeEnd?: () => void;
  /** Board width in px. */
  boardPx: number;
  /** Plays the win sweep along the path. */
  celebrate?: boolean;
}

/**
 * The playable grid. One pan gesture drives everything: every cell the finger
 * touches is handed to the engine's applyCell, which decides what (if anything)
 * changes. Touch-down on a path cell truncates to it, which also covers taps.
 */
export function Board({ puzzle, path, onPathChange, onStrokeStart, onStrokeEnd, boardPx, celebrate = false }: BoardProps) {
  const layout = useMemo(() => makeLayout(puzzle.size, boardPx), [puzzle.size, boardPx]);

  // The gesture never reads `path` directly: every touched cell is sent as an
  // updater, so the gesture object only has to change when the puzzle, the
  // layout, or the callbacks change. That keeps one handler alive for the
  // whole stroke instead of rebuilding it on every path update.
  const gesture = useMemo(() => {
    const handlePoint = (x: number, y: number) => {
      const cell = cellAtPoint(layout, x, y);
      if (cell === null) return;
      // applyCell returns the previous array when nothing changes, so React
      // skips the re-render for touch events that stay inside the head cell.
      onPathChange((previous) => applyCell(puzzle, previous, cell));
    };
    return Gesture.Pan()
      .runOnJS(true)
      .minDistance(2)
      .maxPointers(1)
      .shouldCancelWhenOutside(false)
      .withTestId('board-pan')
      .onBegin((e) => {
        onStrokeStart?.();
        handlePoint(e.x, e.y);
      })
      .onStart((e) => handlePoint(e.x, e.y))
      .onUpdate((e) => handlePoint(e.x, e.y))
      .onFinalize(() => onStrokeEnd?.());
  }, [layout, puzzle, onPathChange, onStrokeStart, onStrokeEnd]);

  const onPathSet = useMemo(() => new Set(path), [path]);
  const reachedUpTo = nextCheckpoint(puzzle, path) - 1;
  const cells = [];
  for (let i = 0; i < puzzle.size * puzzle.size; i++) {
    const row = Math.floor(i / puzzle.size);
    const col = i % puzzle.size;
    cells.push(
      <Cell
        key={i}
        left={col * layout.cellPx}
        top={row * layout.cellPx}
        sizePx={layout.cellPx}
        checkpoint={checkpointNumber(puzzle, i)}
        onPath={onPathSet.has(i)}
      />,
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.board, { width: boardPx, height: boardPx }]} collapsable={false}>
        {cells}
        <PathLayer layout={layout} path={path} celebrate={celebrate} />
        {puzzle.checkpoints.map((cell, i) => (
          <CheckpointLabel
            key={cell}
            left={(cell % puzzle.size) * layout.cellPx}
            top={Math.floor(cell / puzzle.size) * layout.cellPx}
            sizePx={layout.cellPx}
            number={i + 1}
            reached={i + 1 <= reachedUpTo}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  board: {
    backgroundColor: '#ffffff',
  },
});
