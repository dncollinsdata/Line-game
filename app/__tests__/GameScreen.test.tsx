import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { GameScreen } from '../GameScreen';
import { LEVELS } from '../../lib/levels';
import { generatePuzzle } from '../../engine/generate';
import { cellCenter, makeLayout } from '../../components/layout';
import { Board } from '../../components/Board';

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  return { Canvas: View, Path: View };
});

const level = LEVELS[0];
const solution = generatePuzzle(level.size, level.seed).solution;

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

function texts(renderer: ReturnType<typeof create>): string[] {
  return renderer.root.findAllByType(Text).map((t) => String(t.props.children));
}

describe('GameScreen', () => {
  it('marks the level solved after drawing the full solution and offers the next level', async () => {
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
    expect(texts(renderer)).toContain('Next level');
    await act(async () => renderer.unmount());
  });

  it('undo reverts the last whole stroke and reset clears the path', async () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <GameScreen level={level} hasNext onSolved={() => {}} onNext={() => {}} onBack={() => {}} />,
      );
    });
    const pressButton = (label: string) => {
      const button = renderer.root.findAllByType(Text).find((t) => t.props.children === label);
      if (!button) throw new Error(`No button ${label}`);
      let node = button.parent;
      while (node && typeof node.props.onPress !== 'function') node = node.parent;
      if (!node) throw new Error(`No pressable ancestor for ${label}`);
      const press = node.props.onPress;
      act(() => press());
    };
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
