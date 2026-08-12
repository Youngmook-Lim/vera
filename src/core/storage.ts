import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Four ordinary stores. Modules 01 and 02 each own their own — neither has
// anything to do with her soul or the transcript, and she is not told what is
// in either of them.
export const KEYS = {
  soul: 'facility.v2.soul',
  transcript: 'facility.v2.transcript',
  organism: 'facility.mod01.organism',
  identity: 'facility.mod02.identity',
} as const;

// The fourth store. Device-local, in the OS keystore, never in MEMORY.md and
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
