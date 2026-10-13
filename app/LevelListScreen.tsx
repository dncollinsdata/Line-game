import React, { useCallback } from 'react';
import { FlatList, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { eventsAsJson } from '../lib/eventLog';
import { LEVELS, LevelDefinition } from '../lib/levels';

interface LevelListScreenProps {
  completed: Set<number>;
  onSelectLevel: (id: number) => void;
}

export function LevelListScreen({ completed, onSelectLevel }: LevelListScreenProps) {
  // Hidden debug action: long-press the title to share the event log as JSON.
  const shareEventLog = useCallback(async () => {
    try {
      const json = await eventsAsJson();
      await Share.share({ title: 'Pathline event log', message: json });
    } catch {
      // The share sheet was dismissed or is unavailable. Nothing to do.
    }
  }, []);

  const renderItem = ({ item }: { item: LevelDefinition }) => {
    const done = completed.has(item.id);
    return (
      <Pressable
        onPress={() => onSelectLevel(item.id)}
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        <Text style={styles.rowTitle}>Level {item.id}</Text>
        <Text style={styles.rowMeta}>
          {item.size}x{item.size}
        </Text>
        <Text style={[styles.rowCheck, done ? styles.rowCheckDone : null]}>{done ? '✓' : ''}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Pressable onLongPress={shareEventLog} delayLongPress={600} testID="level-list-title">
        <Text style={styles.title}>Levels</Text>
      </Pressable>
      <FlatList
        data={LEVELS}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2430',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#f1f1f4',
  },
  rowPressed: {
    opacity: 0.6,
  },
  rowTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2430',
  },
  rowMeta: {
    fontSize: 15,
    color: '#5b6070',
    marginRight: 16,
  },
  rowCheck: {
    width: 24,
    textAlign: 'right',
    fontSize: 17,
    color: '#2f5bea',
  },
  rowCheckDone: {
    fontWeight: '700',
  },
});
