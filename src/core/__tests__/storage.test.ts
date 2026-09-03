import { KEYS, SECURE_KEY, secure, storage } from '../storage';

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
  expect(KEYS.organism).toBe('facility.mod01.organism');
  expect(KEYS.advice).toBe('facility.mod02.advice');
  expect(SECURE_KEY).toBe('facility.v2.credential');
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
