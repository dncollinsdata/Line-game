import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendEvent, eventsAsJson, readEvents } from '../eventLog';

describe('eventLog', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('starts empty', async () => {
    expect(await readEvents()).toEqual([]);
  });

  it('appends events in order, even when appended in the same tick', async () => {
    const a = appendEvent({ type: 'level_start', level: 1, timestamp: 1 });
    const b = appendEvent({ type: 'level_complete', level: 1, seconds: 12.3, steps_removed: 2, resets: 0, timestamp: 2 });
    const c = appendEvent({ type: 'level_abandon', level: 2, seconds: 4, percent_filled: 40, timestamp: 3 });
    await Promise.all([a, b, c]);
    const events = await readEvents();
    expect(events.map((e) => e.timestamp)).toEqual([1, 2, 3]);
    expect(JSON.parse(await eventsAsJson())).toEqual(events);
  });

  it('survives corrupt storage', async () => {
    await AsyncStorage.setItem('pathline.events', 'not json');
    expect(await readEvents()).toEqual([]);
  });
});
