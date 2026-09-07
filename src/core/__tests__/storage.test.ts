import { KEYS, LEGACY_KEYS, SECURE_KEY, secure, storage } from '../storage';

jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    __vault: vault,
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});
const SecureStore = jest.requireMock('expo-secure-store');

beforeEach(async () => {
  jest.clearAllMocks();
  await storage.clearAll();
  await secure.remove();
});

test('exposes the five v2 stores', () => {
  expect(KEYS.soul).toBe('facility.v2.soul');
  expect(KEYS.transcript).toBe('facility.v2.transcript');
  expect(KEYS.memory).toBe('facility.v2.memory');
  expect(KEYS.organism).toBe('facility.mod.organism');
  expect(KEYS.advice).toBe('facility.mod.advice');
  expect(SECURE_KEY).toBe('facility.v2.credential');
});

test('no module key names a slot: rooms move, and the key must not', () => {
  expect(KEYS.organism).not.toMatch(/mod\d/);
  expect(KEYS.advice).not.toMatch(/mod\d/);
});

test('a blob under the old slot-named key is carried over on the first read', async () => {
  await storage.set(LEGACY_KEYS[KEYS.advice], '{"favorites":["a"]}');
  expect(await storage.get(KEYS.advice)).toBe('{"favorites":["a"]}');

  // Carried, not copied: a second reader must not find the old blob still
  // there to carry a second time.
  expect(await storage.get(LEGACY_KEYS[KEYS.advice])).toBeNull();
  expect(await storage.get(KEYS.advice)).toBe('{"favorites":["a"]}');
});

test('both module stores carry over, and nothing else has an old name', async () => {
  await storage.set(LEGACY_KEYS[KEYS.organism], '{"hunger":40}');
  expect(await storage.get(KEYS.organism)).toBe('{"hunger":40}');
  expect(Object.keys(LEGACY_KEYS)).toEqual([KEYS.organism, KEYS.advice]);
});

test('a value already at the new key wins: the old blob never overwrites it', async () => {
  await storage.set(KEYS.advice, 'current');
  await storage.set(LEGACY_KEYS[KEYS.advice], 'stale');
  expect(await storage.get(KEYS.advice)).toBe('current');
});

test('a key with no old name reads null rather than reaching for one', async () => {
  expect(await storage.get(KEYS.soul)).toBeNull();
});

test('round-trips ordinary values', async () => {
  await storage.set(KEYS.soul, '{"visits":3}');
  expect(await storage.get(KEYS.soul)).toBe('{"visits":3}');
  await storage.remove(KEYS.soul);
  expect(await storage.get(KEYS.soul)).toBeNull();
});

test('clearAll removes every ordinary store, both modules included', async () => {
  await storage.set(KEYS.soul, 's');
  await storage.set(KEYS.transcript, 't');
  await storage.set(KEYS.organism, 'o');
  await storage.set(KEYS.advice, 'a');
  await storage.clearAll();
  expect(await storage.get(KEYS.soul)).toBeNull();
  expect(await storage.get(KEYS.transcript)).toBeNull();
  expect(await storage.get(KEYS.organism)).toBeNull();
  expect(await storage.get(KEYS.advice)).toBeNull();
});

test('clearAll takes the old slot-named keys too, read or not', async () => {
  await storage.set(LEGACY_KEYS[KEYS.organism], 'o');
  await storage.set(LEGACY_KEYS[KEYS.advice], 'a');
  await storage.clearAll();
  // A leftover old blob would not sit there quietly: the next read of either
  // store would carry it back in, undoing the wipe.
  expect(await storage.get(KEYS.organism)).toBeNull();
  expect(await storage.get(KEYS.advice)).toBeNull();
});

test('the credential lives in the keystore, not in AsyncStorage', async () => {
  await secure.set('sk-ant-secret');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith(SECURE_KEY, 'sk-ant-secret');
  expect(await secure.get()).toBe('sk-ant-secret');
  expect(await storage.get(SECURE_KEY)).toBeNull();

  await secure.remove();
  expect(await secure.get()).toBe('');
});

test('a missing credential reads as the empty string, never null', async () => {
  expect(await secure.get()).toBe('');
});

test('a keystore failure never throws: she just stays dormant', async () => {
  SecureStore.getItemAsync.mockRejectedValueOnce(new Error('no keystore'));
  expect(await secure.get()).toBe('');

  SecureStore.setItemAsync.mockRejectedValueOnce(new Error('no keystore'));
  await expect(secure.set('sk-ant-secret')).resolves.toBeUndefined();

  SecureStore.deleteItemAsync.mockRejectedValueOnce(new Error('no keystore'));
  await expect(secure.remove()).resolves.toBeUndefined();
});
