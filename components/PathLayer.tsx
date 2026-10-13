import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { BoardLayout, cellCenter } from './layout';

interface PathLayerProps {
  layout: BoardLayout;
  path: number[];
  /** When true, a highlight sweeps along the whole path once. */
  celebrate: boolean;
}

export const EXTEND_MS = 90;
export const CELEBRATE_MS = 600;

/**
 * Draws the player's path as one stroked Skia path with round joins and caps.
 * When a cell is added, the newest segment eases in by animating the path's
 * trim `end` from the previous length to the full length. Removing cells snaps.
 */
export function PathLayer({ layout, path, celebrate }: PathLayerProps) {
  const svg = useMemo(() => {
    if (path.length === 0) return '';
    const parts = path.map((cell, i) => {
      const { x, y } = cellCenter(layout, cell);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    // A single-cell path still needs a visible dot: draw a zero-length segment.
    if (path.length === 1) parts.push(parts[0].replace('M', 'L'));
    return parts.join(' ');
  }, [layout, path]);

  const end = useSharedValue(1);
  const previousLength = useRef(0);
  useEffect(() => {
    const previous = previousLength.current;
    previousLength.current = path.length;
    const oldSegments = Math.max(0, previous - 1);
    const newSegments = path.length - 1;
    if (newSegments > oldSegments && newSegments > 0) {
      end.value = oldSegments / newSegments;
      end.value = withTiming(1, { duration: EXTEND_MS, easing: Easing.out(Easing.quad) });
    } else {
      end.value = 1;
    }
  }, [path, end]);

  const sweep = useSharedValue(0);
  useEffect(() => {
    if (celebrate) {
      sweep.value = 0;
      sweep.value = withTiming(1, { duration: CELEBRATE_MS, easing: Easing.inOut(Easing.quad) });
    } else {
      sweep.value = 0;
    }
  }, [celebrate, sweep]);

  return (
    <Canvas pointerEvents="none" style={[StyleSheet.absoluteFill, { width: layout.boardPx, height: layout.boardPx }]}>
      {svg !== '' ? (
        <Path
          path={svg}
          end={end}
          style="stroke"
          strokeWidth={layout.cellPx * 0.5}
          strokeJoin="round"
          strokeCap="round"
          color="#4f7bf5"
        />
      ) : null}
      {svg !== '' && celebrate ? (
        <Path
          path={svg}
          end={sweep}
          style="stroke"
          strokeWidth={layout.cellPx * 0.5}
          strokeJoin="round"
          strokeCap="round"
          color="#1f3fb8"
        />
      ) : null}
    </Canvas>
  );
}
