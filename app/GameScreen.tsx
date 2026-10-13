import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Board } from '../components/Board';
import { CELEBRATE_MS } from '../components/PathLayer';
import { checkpointNumber, isSolved } from '../engine/pathEdit';
import { appendEvent } from '../lib/eventLog';
import { hapticCell, hapticCheckpoint, hapticWin } from '../lib/haptics';
import { LevelDefinition } from '../lib/levels';

const SIDE_MARGIN = 16;
const MAX_BOARD = 440;

type LastEdit = { kind: 'extend'; cells: number[] } | { kind: 'shrink' } | null;

interface GameState {
  path: number[];
  /** Path as it was before each finished stroke (drag or tap). Undo pops one. */
  history: number[][];
  /** Path at the start of the stroke in progress, or null between strokes. */
  strokeStart: number[] | null;
  /** What the most recent path change did, for haptics. */
  lastEdit: LastEdit;
  /** Increments on every path change so effects can key on it. */
  editSeq: number;
  /** Cells removed by dragging back, tapping back, or undo. */
  stepsRemoved: number;
  resets: number;
  startedAt: number;
}

type GameAction =
  | { type: 'path'; update: (previous: number[]) => number[] }
  | { type: 'strokeStart' }
  | { type: 'strokeEnd' }
  | { type: 'undo' }
  | { type: 'reset' };

function makeInitialState(): GameState {
  return {
    path: [],
    history: [],
    strokeStart: null,
    lastEdit: null,
    editSeq: 0,
    stepsRemoved: 0,
    resets: 0,
    startedAt: Date.now(),
  };
}

function withPath(state: GameState, next: number[]): GameState {
  const grew = next.length > state.path.length;
  const lastEdit: LastEdit = grew ? { kind: 'extend', cells: next.slice(state.path.length) } : { kind: 'shrink' };
  return {
    ...state,
    path: next,
    lastEdit,
    editSeq: state.editSeq + 1,
    stepsRemoved: state.stepsRemoved + (grew ? 0 : state.path.length - next.length),
  };
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'path': {
      const next = action.update(state.path);
      return next === state.path ? state : withPath(state, next);
    }
    case 'strokeStart':
      return { ...state, strokeStart: state.path };
    case 'strokeEnd': {
      const { strokeStart } = state;
      if (strokeStart === null || strokeStart === state.path) return { ...state, strokeStart: null };
      return { ...state, strokeStart: null, history: [...state.history, strokeStart] };
    }
    case 'undo': {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return { ...withPath(state, previous), history: state.history.slice(0, -1) };
    }
    case 'reset':
      return {
        ...makeInitialState(),
        startedAt: state.startedAt,
        stepsRemoved: state.stepsRemoved,
        resets: state.resets + 1,
      };
  }
}

function elapsedSeconds(startedAt: number): number {
  return Math.round((Date.now() - startedAt) / 100) / 10;
}

interface GameScreenProps {
  level: LevelDefinition;
  hasNext: boolean;
  onSolved: (id: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function GameScreen({ level, hasNext, onSolved, onNext, onBack }: GameScreenProps) {
  const { width } = useWindowDimensions();
  const boardPx = Math.min(width - SIDE_MARGIN * 2, MAX_BOARD);

  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const { path, history, lastEdit, editSeq, stepsRemoved, resets, startedAt } = state;
  const solved = isSolved(level, path);
  const [celebrationDone, setCelebrationDone] = useState(false);

  useEffect(() => {
    appendEvent({ type: 'level_start', level: level.id, timestamp: Date.now() });
  }, [level.id]);

  // Haptics: one tick per path change, stronger when a checkpoint was entered.
  useEffect(() => {
    if (editSeq === 0 || lastEdit === null || lastEdit.kind !== 'extend') return;
    if (lastEdit.cells.some((cell) => checkpointNumber(level, cell) > 0)) hapticCheckpoint();
    else hapticCell();
  }, [editSeq, lastEdit, level]);

  useEffect(() => {
    if (!solved) return;
    hapticWin();
    onSolved(level.id);
    appendEvent({
      type: 'level_complete',
      level: level.id,
      seconds: elapsedSeconds(startedAt),
      steps_removed: stepsRemoved,
      resets,
      timestamp: Date.now(),
    });
    const timer = setTimeout(() => setCelebrationDone(true), CELEBRATE_MS + 50);
    return () => clearTimeout(timer);
    // Stats are read once at the moment of solving; later changes are impossible while solved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved, level.id, onSolved]);

  // Once solved the board is frozen, so `solved` only ever goes false -> true
  // for a given level and the celebration timer runs exactly once.
  const onPathChange = useCallback(
    (update: (previous: number[]) => number[]) =>
      dispatch({ type: 'path', update: (previous) => (isSolved(level, previous) ? previous : update(previous)) }),
    [level],
  );
  const onStrokeStart = useCallback(() => dispatch({ type: 'strokeStart' }), []);
  const onStrokeEnd = useCallback(() => dispatch({ type: 'strokeEnd' }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const back = useCallback(() => {
    if (!solved) {
      const cells = level.size * level.size;
      appendEvent({
        type: 'level_abandon',
        level: level.id,
        seconds: elapsedSeconds(startedAt),
        percent_filled: Math.round((path.length / cells) * 100),
        timestamp: Date.now(),
      });
    }
    onBack();
  }, [solved, level, startedAt, path.length, onBack]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={({ pressed }) => [pressed ? styles.pressed : null]}>
          <Text style={styles.headerLink}>Levels</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Level {level.id}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <Text style={styles.hint}>Connect the numbers in order and fill the grid.</Text>
      <Board
        puzzle={level}
        path={path}
        onPathChange={onPathChange}
        onStrokeStart={onStrokeStart}
        onStrokeEnd={onStrokeEnd}
        boardPx={boardPx}
        celebrate={solved}
      />
      <View style={styles.controls}>
        {solved ? (
          <>
            <Text style={styles.status}>Solved</Text>
            {celebrationDone ? (
              <Pressable
                onPress={hasNext ? onNext : onBack}
                style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed ? styles.pressed : null]}
              >
                <Text style={[styles.buttonText, styles.buttonPrimaryText]}>{hasNext ? 'Next level' : 'All levels done'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <View style={styles.buttonRow}>
            <Pressable
              onPress={undo}
              disabled={history.length === 0}
              style={({ pressed }) => [styles.button, history.length === 0 ? styles.buttonDisabled : null, pressed ? styles.pressed : null]}
            >
              <Text style={styles.buttonText}>Undo</Text>
            </Pressable>
            <Pressable
              onPress={reset}
              disabled={path.length === 0}
              style={({ pressed }) => [styles.button, path.length === 0 ? styles.buttonDisabled : null, pressed ? styles.pressed : null]}
            >
              <Text style={styles.buttonText}>Reset</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: SIDE_MARGIN,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLink: {
    fontSize: 17,
    color: '#2f5bea',
    width: 72,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2430',
  },
  headerSpacer: {
    width: 72,
  },
  hint: {
    fontSize: 15,
    color: '#5b6070',
    marginBottom: 20,
  },
  controls: {
    marginTop: 24,
    alignItems: 'center',
    minHeight: 100,
  },
  status: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2f5bea',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#eef0f5',
  },
  buttonPrimary: {
    backgroundColor: '#2f5bea',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2430',
  },
  buttonPrimaryText: {
    color: '#ffffff',
  },
});
