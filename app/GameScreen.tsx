import React, { useCallback, useEffect, useReducer } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Board } from '../components/Board';
import { isSolved } from '../engine/pathEdit';
import { LevelDefinition } from '../lib/levels';

const SIDE_MARGIN = 16;
const MAX_BOARD = 440;

interface GameState {
  path: number[];
  /** Path as it was before each finished stroke (drag or tap). Undo pops one. */
  history: number[][];
  /** Path at the start of the stroke in progress, or null between strokes. */
  strokeStart: number[] | null;
}

type GameAction =
  | { type: 'path'; update: (previous: number[]) => number[] }
  | { type: 'strokeStart' }
  | { type: 'strokeEnd' }
  | { type: 'undo' }
  | { type: 'reset' };

const initialState: GameState = { path: [], history: [], strokeStart: null };

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'path': {
      const next = action.update(state.path);
      return next === state.path ? state : { ...state, path: next };
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
      return { ...state, path: state.history[state.history.length - 1], history: state.history.slice(0, -1) };
    }
    case 'reset':
      return initialState;
  }
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

  const [state, dispatch] = useReducer(reducer, initialState);
  const { path, history } = state;
  const solved = isSolved(level, path);

  useEffect(() => {
    if (solved) onSolved(level.id);
  }, [solved, level.id, onSolved]);

  const onPathChange = useCallback((update: (previous: number[]) => number[]) => dispatch({ type: 'path', update }), []);
  const onStrokeStart = useCallback(() => dispatch({ type: 'strokeStart' }), []);
  const onStrokeEnd = useCallback(() => dispatch({ type: 'strokeEnd' }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12} style={({ pressed }) => [pressed ? styles.pressed : null]}>
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
      />
      <View style={styles.controls}>
        {solved ? (
          <>
            <Text style={styles.status}>Solved</Text>
            {hasNext ? (
              <Pressable onPress={onNext} style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed ? styles.pressed : null]}>
                <Text style={[styles.buttonText, styles.buttonPrimaryText]}>Next level</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onBack} style={({ pressed }) => [styles.button, styles.buttonPrimary, pressed ? styles.pressed : null]}>
                <Text style={[styles.buttonText, styles.buttonPrimaryText]}>All levels done</Text>
              </Pressable>
            )}
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
