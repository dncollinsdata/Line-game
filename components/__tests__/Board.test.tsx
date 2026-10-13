import React from 'react';
import { act, create } from 'react-test-renderer';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import type { PanGesture } from 'react-native-gesture-handler';
import { Board } from '../Board';
import { HARDCODED_PUZZLE } from '../../app/hardcodedPuzzle';
import { cellAtPoint, cellCenter, makeLayout } from '../layout';
import { Text } from 'react-native';

jest.mock('@shopify/react-native-skia', () => {
  const { View } = jest.requireActual('react-native');
  return { Canvas: View, Path: View };
});

describe('Board', () => {
  it('renders every cell and checkpoint label for the hardcoded puzzle', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <Board puzzle={HARDCODED_PUZZLE} path={[]} onPathChange={() => {}} boardPx={350} />,
      );
    });
    const texts = renderer.root.findAllByType(Text);
    expect(texts.map((t) => t.props.children)).toEqual(
      HARDCODED_PUZZLE.checkpoints.map((_, i) => i + 1),
    );
    act(() => renderer.unmount());
  });

  it('extends the path as a drag passes through cells and truncates on the way back', () => {
    const layout = makeLayout(7, 350);
    const start = HARDCODED_PUZZLE.checkpoints[0]; // cell 22: row 3, col 1
    let path: number[] = [];
    const onPathChange = (update: (previous: number[]) => number[]) => {
      path = update(path);
    };
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <Board puzzle={HARDCODED_PUZZLE} path={path} onPathChange={onPathChange} boardPx={350} />,
      );
    });
    const at = (cell: number) => cellCenter(layout, cell);
    act(() => {
      fireGestureHandler<PanGesture>(getByGestureTestId('board-pan'), [
        { state: State.BEGAN, ...at(start) },
        { state: State.ACTIVE, ...at(start + 1) },
        { ...at(start + 2) },
        { ...at(start + 1) }, // drag back: removes the last step
        { state: State.END, ...at(start + 1) },
      ]);
    });
    expect(path).toEqual([start, start + 1]);
    act(() => renderer.unmount());
  });
});

describe('cellAtPoint', () => {
  const layout = makeLayout(7, 350);

  it('maps cell centres to indices', () => {
    expect(cellAtPoint(layout, 25, 25)).toBe(0);
    expect(cellAtPoint(layout, 325, 325)).toBe(48);
    expect(cellAtPoint(layout, 75, 25)).toBe(1);
  });

  it('ignores points outside the board or in a cell margin', () => {
    expect(cellAtPoint(layout, -1, 10)).toBeNull();
    expect(cellAtPoint(layout, 350, 10)).toBeNull();
    expect(cellAtPoint(layout, 49, 25)).toBeNull(); // right edge of cell 0
    expect(cellAtPoint(layout, 51, 25)).toBeNull(); // left edge of cell 1
  });
});
