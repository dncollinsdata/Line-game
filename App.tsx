import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameScreen } from './app/GameScreen';
import { LevelListScreen } from './app/LevelListScreen';
import { LEVELS, getLevel } from './lib/levels';
import { loadCompletedLevels, saveCompletedLevels } from './lib/storage';

type Screen = { name: 'list' } | { name: 'game'; levelId: number };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'list' });
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    loadCompletedLevels().then((loaded) => {
      if (!cancelled) setCompleted(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const markCompleted = useCallback((id: number) => {
    setCompleted((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      saveCompletedLevels(next);
      return next;
    });
  }, []);

  const openLevel = useCallback((levelId: number) => setScreen({ name: 'game', levelId }), []);
  const goToList = useCallback(() => setScreen({ name: 'list' }), []);

  let content: React.ReactNode;
  if (screen.name === 'game') {
    const level = getLevel(screen.levelId);
    const next = getLevel(screen.levelId + 1);
    if (level) {
      content = (
        <GameScreen
          key={level.id}
          level={level}
          hasNext={next !== undefined}
          onSolved={markCompleted}
          onNext={() => openLevel(level.id + 1)}
          onBack={goToList}
        />
      );
    }
  }
  if (!content) {
    content = <LevelListScreen completed={completed} onSelectLevel={openLevel} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar style="dark" />
      {content}
    </GestureHandlerRootView>
  );
}

// Referenced so an empty pack fails loudly at import time rather than showing a blank list.
if (LEVELS.length === 0) throw new Error('levels/pack.json has no levels');

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
