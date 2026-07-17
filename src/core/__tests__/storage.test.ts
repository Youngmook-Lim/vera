import { KEYS, storage } from '../storage';

test('round-trips values and exposes the prototype key names', async () => {
  expect(KEYS.enrolled).toBe('facility.enrolled.v1');
  await storage.set(KEYS.enrolled, '1');
  expect(await storage.get(KEYS.enrolled)).toBe('1');
  await storage.remove(KEYS.enrolled);
  expect(await storage.get(KEYS.enrolled)).toBeNull();
});
