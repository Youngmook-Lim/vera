import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  enrolled: 'facility.enrolled.v1',
  lang: 'facility.lang.v1',
  notif: 'facility.notif.v1',
} as const;

// Seam over the storage engine (AsyncStorage today; mmkv could replace it
// after a dev build lands — docs/architecture.md). Callers never import the
// engine directly.
export const storage = {
  get: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  set: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  remove: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
