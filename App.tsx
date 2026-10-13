import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Board } from './components/Board';
import { HARDCODED_PUZZLE } from './app/hardcodedPuzzle';
import { isSolved } from './engine/pathEdit';

const SIDE_MARGIN = 16;
const MAX_BOARD = 440;

export default function App() {
  const { width } = useWindowDimensions();
  const boardPx = Math.min(width - SIDE_MARGIN * 2, MAX_BOARD);
  const puzzle = HARDCODED_PUZZLE;
  const [path, setPath] = useState<number[]>([]);
  const solved = isSolved(puzzle, path);
  const reset = useCallback(() => setPath([]), []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Text style={styles.hint}>Connect the numbers in order and fill the grid.</Text>
        <Board puzzle={puzzle} path={path} onPathChange={setPath} boardPx={boardPx} />
        <Text style={styles.status}>{solved ? 'Solved' : ' '}</Text>
        <Pressable onPress={reset} style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}>
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: SIDE_MARGIN,
  },
  hint: {
    fontSize: 15,
    color: '#5b6070',
    marginBottom: 20,
  },
  status: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#2f5bea',
    height: 28,
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#eef0f5',
  },
  buttonPressed: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2430',
  },
});
