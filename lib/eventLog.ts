import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Local, append-only event log for the playtest. Everything is stored under
 * one AsyncStorage key as a JSON array. Writes are chained so two appends in
 * the same tick cannot clobber each other.
 */

export type GameEvent =
  | { type: 'level_start'; level: number; timestamp: number }
  | { type: 'level_complete'; level: number; seconds: number; steps_removed: number; resets: number; timestamp: number }
  | { type: 'level_abandon'; level: number; seconds: number; percent_filled: number; timestamp: number };

const EVENTS_KEY = 'pathline.events';

let queue: Promise<void> = Promise.resolve();

export async function readEvents(): Promise<GameEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GameEvent[]) : [];
  } catch {
    return [];
  }
}

export function appendEvent(event: GameEvent): Promise<void> {
  queue = queue.then(async () => {
    try {
      const events = await readEvents();
      events.push(event);
      await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(events));
    } catch {
      // Losing one playtest event is not worth crashing over.
    }
  });
  return queue;
}

export async function eventsAsJson(): Promise<string> {
  return JSON.stringify(await readEvents(), null, 2);
}
