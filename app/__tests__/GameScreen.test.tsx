import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { GameScreen } from '../GameScreen';
import { LEVELS } from '../../lib/levels';
import { generatePuzzle } from '../../engine/generate';
import { canExtend, endedEarly } from '../../engine/pathEdit';
import { cellCenter, makeLayout } from '../../components/layout';
import { Board } from '../../components/Board';
import { CELEBRATE_MS } from '../../components/PathLayer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readEvents } from '../../lib/eventLog';
import { hapticCell, hapticCheckpoint, hapticWin } from '../../lib/haptics';

jest.mock('../../lib/haptics', () => ({
  hapticCell: jest.fn(),
  hapticCheckpoint: jest.fn(),
  hapticWin: jest.fn(),
}));

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  return { Canvas: View, Path: View };
});

const level = LEVELS[0];
const solution = generatePuzzle(level.size, level.seed).solution;

/** A legal path that reaches the last checkpoint with cells still empty. */
function findEarlyEnding(): number[] {
  const cells = level.size * level.size;
  const search = (path: number[]): number[] | null => {
    if (endedEarly(level, path)) return path;
    for (let cell = 0; cell < cells; cell++) {
      if (!canExtend(level, path, cell)) continue;
      const found = search([...path, cell]);
      if (found) return found;
    }
    return null;
  };
  const found = search([level.checkpoints[0]]);
  if (!found) throw new Error('No early-ending path for level 1');
  return found;
}

/**
 * Simulate one finger stroke through `cells`. Gesture-handler delivers the
 * BEGAN and first ACTIVE events as state changes (onBegin, onStart) and only
 * later events as updates, so the first cell is sent twice before the rest.
 */
function stroke(renderer: ReturnType<typeof create>, cells: number[]) {
  const boardPx: number = renderer.root.findByType(Board).props.boardPx;
  const layout = makeLayout(level.size, boardPx);
  const at = (cell: number) => cellCenter(layout, cell);
  const events: { state?: State; x: number; y: number }[] = [
    { state: State.BEGAN, ...at(cells[0]) },
    { state: State.ACTIVE, ...at(cells[0]) },
    ...cells.slice(1).map((cell) => at(cell)),
    { state: State.END, ...at(cells[cells.length - 1]) },
  ];
  act(() => {
    fireGestureHandler<PanGesture>(getByGestureTestId('board-pan'), events);
  });
}

/**
 * Like `stroke`, but one touch event per act, so React renders between cells
 * the way it does on a device where every gesture event is its own JS task.
 * Needed when a test checks per-cell side effects such as haptics.
 */
function strokeCellByCell(renderer: ReturnType<typeof create>, cells: number[]) {
  const boardPx: number = renderer.root.findByType(Board).props.boardPx;
  const layout = makeLayout(level.size, boardPx);
  const at = (cell: number) => cellCenter(layout, cell);
  act(() => {
    fireGestureHandler<PanGesture>(getByGestureTestId('board-pan'), [
      { state: State.BEGAN, ...at(cells[0]) },
      { state: State.ACTIVE, ...at(cells[0]) },
    ]);
  });
  for (const cell of cells.slice(1)) {
    act(() => {
      fireGestureHandler<PanGesture>(getByGestureTestId('board-pan'), [{ state: State.ACTIVE, ...at(cell) }]);
    });
  }
}

function pressButton(renderer: ReturnType<typeof create>, label: string) {
  const button = renderer.root.findAllByType(Text).find((t) => t.props.children === label);
  if (!button) throw new Error(`No button ${label}`);
  let node = button.parent;
  while (node && typeof node.props.onPress !== 'function') node = node.parent;
  if (!node) throw new Error(`No pressable ancestor for ${label}`);
  const press = node.props.onPress;
  act(() => press());
}
const pressButtonIn = pressButton;

function texts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root.findAllByType(Text).map((t) => String(t.props.children));
}

describe('GameScreen', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('marks the level solved after drawing the full solution and offers the next level', async () => {
    jest.useFakeTimers();
    const onSolved = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={onSolved} onNext={() => {}} onBack={() => {}} />,
      );
    });
    expect(texts(renderer)).not.toContain('Solved');
    stroke(renderer, solution);
    expect(onSolved).toHaveBeenCalledWith(level.id);
    expect(texts(renderer)).toContain('Solved');
    // The next-level button waits for the win sweep to finish.
    expect(texts(renderer)).not.toContain('Next level');
    act(() => {
      jest.advanceTimersByTime(CELEBRATE_MS + 100);
    });
    expect(texts(renderer)).toContain('Next level');
    expect(hapticWin).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
    await act(async () => renderer.unmount());
  });

  it('ticks haptics per entered cell and stronger on checkpoints', async () => {
    jest.mocked(hapticCell).mockClear();
    jest.mocked(hapticCheckpoint).mockClear();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={() => {}} />,
      );
    });
    // Checkpoint 1 is the first cell; the next two are plain cells for level 1.
    strokeCellByCell(renderer, solution.slice(0, 3));
    expect(hapticCheckpoint).toHaveBeenCalledTimes(1);
    expect(hapticCell).toHaveBeenCalledTimes(2);
    await act(async () => renderer.unmount());
  });

  it('logs level_start, then level_complete with steps removed and resets', async () => {
    jest.useFakeTimers();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={() => {}} />,
      );
    });
    const press = (label: string) => pressButton(renderer, label);
    stroke(renderer, solution.slice(0, 4));
    stroke(renderer, [solution[3], solution[1]]); // drag back two cells
    press('Reset');
    stroke(renderer, solution);
    await act(async () => {
      jest.advanceTimersByTime(10);
    });
    const events = await readEvents();
    const types = events.filter((e) => e.level === level.id).map((e) => e.type);
    expect(types).toEqual(['level_start', 'level_complete']);
    const complete = events.find((e) => e.type === 'level_complete');
    expect(complete).toMatchObject({ level: level.id, steps_removed: 2, resets: 1 });
    jest.useRealTimers();
    await act(async () => renderer.unmount());
  });

  it('logs level_abandon with percent filled when leaving unsolved', async () => {
    const onBack = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={onBack} />,
      );
    });
    stroke(renderer, solution.slice(0, 5)); // 5 of 25 cells
    pressButton(renderer, 'Levels');
    expect(onBack).toHaveBeenCalledTimes(1);
    await act(async () => {});
    const events = await readEvents();
    const abandon = events.filter((e) => e.type === 'level_abandon').pop();
    expect(abandon).toMatchObject({ level: level.id, percent_filled: 20 });
    await act(async () => renderer.unmount());
  });

  it('swaps the instruction for a hint when the path reaches the last number early', async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={() => {}} />,
      );
    });
    const instruction = 'Connect the numbers in order and fill the grid.';
    const hint = `Fill every square before ending on ${level.checkpoints.length}.`;
    const early = findEarlyEnding();

    stroke(renderer, early.slice(0, -1));
    expect(texts(renderer)).toContain(instruction);
    expect(texts(renderer)).not.toContain(hint);

    stroke(renderer, early.slice(-2));
    expect(texts(renderer)).toContain(hint);
    expect(texts(renderer)).not.toContain(instruction);

    pressButton(renderer, 'Undo');
    expect(texts(renderer)).toContain(instruction);
    expect(texts(renderer)).not.toContain(hint);
    await act(async () => renderer.unmount());
  });

  it('undo reverts the last whole stroke and reset clears the path', async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={() => {}} />,
      );
    });
    const pressButton = (label: string) => pressButtonIn(renderer, label);
    const pathCells = (): number => renderer.root.findByType(Board).props.path.length;

    stroke(renderer, solution.slice(0, 3));
    expect(pathCells()).toBe(3);
    stroke(renderer, solution.slice(2, 5));
    expect(pathCells()).toBe(5);

    pressButton('Undo');
    expect(pathCells()).toBe(3);
    pressButton('Undo');
    expect(pathCells()).toBe(0);

    stroke(renderer, solution.slice(0, 4));
    expect(pathCells()).toBe(4);
    pressButton('Reset');
    expect(pathCells()).toBe(0);
    await act(async () => renderer.unmount());
  });
});
