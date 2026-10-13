import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPLETED_KEY = 'pathline.completedLevels';

export async function loadCompletedLevels(): Promise<Set<number>> {
  try {
    const raw = await AsyncStorage.getItem(COMPLETED_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is number => typeof v === 'number'));
  } catch {
    return new Set();
  }
}

export async function saveCompletedLevels(completed: Set<number>): Promise<void> {
  try {
    await AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(Array.from(completed).sort((a, b) => a - b)));
  } catch {
    // Storage failures are not worth surfacing in a prototype.
  }
}
