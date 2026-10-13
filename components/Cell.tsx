import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface CellProps {
  left: number;
  top: number;
  sizePx: number;
  /** 1-based checkpoint number, or 0 for a plain cell. */
  checkpoint: number;
  onPath: boolean;
}

/**
 * One grid square. The path is drawn by PathLayer, so this only shows the
 * square itself. Checkpoint numbers are drawn by CheckpointLabel above the path.
 */
function CellImpl({ left, top, sizePx, onPath }: CellProps) {
  return (
    <View
      style={[
        styles.cell,
        { left, top, width: sizePx, height: sizePx },
        onPath ? styles.cellOnPath : null,
      ]}
    />
  );
}

export const Cell = React.memo(CellImpl);

interface LabelProps {
  left: number;
  top: number;
  sizePx: number;
  number: number;
  reached: boolean;
}

function CheckpointLabelImpl({ left, top, sizePx, number, reached }: LabelProps) {
  const diameter = sizePx * 0.62;
  return (
    <View
      pointerEvents="none"
      style={[
        styles.label,
        {
          left: left + (sizePx - diameter) / 2,
          top: top + (sizePx - diameter) / 2,
          width: diameter,
          height: diameter,
          borderRadius: diameter / 2,
        },
        reached ? styles.labelReached : null,
      ]}
    >
      <Text style={[styles.labelText, { fontSize: diameter * 0.5 }]}>{number}</Text>
    </View>
  );
}

export const CheckpointLabel = React.memo(CheckpointLabelImpl);

const styles = StyleSheet.create({
  cell: {
    position: 'absolute',
    backgroundColor: '#f1f1f4',
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 4,
  },
  cellOnPath: {
    backgroundColor: '#e6ecfb',
  },
  label: {
    position: 'absolute',
    backgroundColor: '#1f2430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelReached: {
    backgroundColor: '#2f5bea',
  },
  labelText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
