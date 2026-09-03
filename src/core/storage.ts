import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Five ordinary stores. Modules 01 and 02 each own their own — neither has
// anything to do with her soul or the transcript, and she is not told what is
// in either. Module 02's holds only the cards you kept: its deck is shuffled
// fresh every time the room is opened, and the sort is a way of looking rather
// than a thing you own. An install upgrading from the identity page leaves one
// orphan `facility.mod02.identity` blob that nothing reads and nothing clears.
// Her memory is its own store: it outgrew the soul blob when it stopped being
// a flat list of impressions (continuity §3).
export const KEYS = {
  soul: 'facility.v2.soul',
  transcript: 'facility.v2.transcript',
  memory: 'facility.v2.memory',
  organism: 'facility.mod01.organism',
  advice: 'facility.mod02.advice',
} as const;

// The sixth store. Device-local, in the OS keystore, never in her record and
// never in the transcript (spec §9).
export const SECURE_KEY = 'facility.v2.credential';

export const storage = {
  get: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  set: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  remove: (key: string): Promise<void> => AsyncStorage.removeItem(key),
  clearAll: (): Promise<void> => AsyncStorage.multiRemove(Object.values(KEYS)),
};

// A failure here must never take the app down: a phone with no keystore
// available is a phone where she simply stays dormant.
export const secure = {
  get: async (): Promise<string> => {
    try {
      return (await SecureStore.getItemAsync(SECURE_KEY)) ?? '';
    } catch {
      return '';
    }
  },
  set: async (value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(SECURE_KEY, value);
    } catch {
      // ignored — she wakes for this session and asks again next launch
    }
  },
  remove: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(SECURE_KEY);
    } catch {
      // ignored
    }
  },
};
