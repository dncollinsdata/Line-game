import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path } from '@shopify/react-native-skia';
import { BoardLayout, cellCenter } from './layout';

interface PathLayerProps {
  layout: BoardLayout;
  path: number[];
}

/**
 * Draws the player's path as one stroked Skia path with round joins and caps,
 * through the centre of every cell on the path.
 */
export function PathLayer({ layout, path }: PathLayerProps) {
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

  return (
    <Canvas pointerEvents="none" style={[StyleSheet.absoluteFill, { width: layout.boardPx, height: layout.boardPx }]}>
      {svg !== '' ? (
        <Path
          path={svg}
          style="stroke"
          strokeWidth={layout.cellPx * 0.5}
          strokeJoin="round"
          strokeCap="round"
          color="#4f7bf5"
        />
      ) : null}
    </Canvas>
  );
}
