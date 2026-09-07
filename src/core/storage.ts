import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Five ordinary stores. The two furnished rooms each own their own — neither has
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
  organism: 'facility.mod.organism',
  advice: 'facility.mod.advice',
} as const;

// Both module keys used to name the slot their room sat in — and rooms move.
// When the advice room took slot 01 the number in `facility.mod02.advice`
// became a fossil, and worse, a name the NEXT room in slot 02 would look like
// it owned. Nothing ever read the number, so it is gone from both names; what
// disambiguates a module store is the module, which is the last segment.
//
// A device holding a blob under the old name is carried over the first time
// that store is read, once, and the old name removed in the same pass. This is
// the whole migration: neither module knows it happened, because both read
// through `storage.get`.
export const LEGACY_KEYS: Readonly<Record<string, string>> = {
  [KEYS.organism]: 'facility.mod01.organism',
  [KEYS.advice]: 'facility.mod02.advice',
};

// The sixth store. Device-local, in the OS keystore, never in her record and
// never in the transcript (spec §9).
export const SECURE_KEY = 'facility.v2.credential';

export const storage = {
  // A value already at the current name always wins. The old blob is reached
  // for only when there is nothing to read — otherwise a device that had
  // already migrated and moved on would have its record replaced by whatever
  // it held before the rename.
  get: async (key: string): Promise<string | null> => {
    const current = await AsyncStorage.getItem(key);
    if (current !== null) return current;

    const legacy = LEGACY_KEYS[key];
    if (legacy === undefined) return null;

    const carried = await AsyncStorage.getItem(legacy);
    if (carried === null) return null;

    await AsyncStorage.setItem(key, carried);
    await AsyncStorage.removeItem(legacy);
    return carried;
  },
  set: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  remove: (key: string): Promise<void> => AsyncStorage.removeItem(key),
  // The old names go too. A wipe that left them behind would be undone by the
  // next read of either module store, which would carry the old blob back in.
  clearAll: (): Promise<void> =>
    AsyncStorage.multiRemove([...Object.values(KEYS), ...Object.values(LEGACY_KEYS)]),
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
