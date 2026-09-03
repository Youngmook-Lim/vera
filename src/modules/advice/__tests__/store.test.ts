import { KEYS, storage } from '../../../core/storage';
import { parse } from '../favorites';
import { useAdviceStore } from '../store';

const onDisk = async () => parse(await storage.get(KEYS.advice));

// A cold start: nothing hydrated, whatever is on disk is all there is.
const coldStart = async () => {
  useAdviceStore.setState({ hydrated: false, favorites: new Set() });
  await useAdviceStore.getState().hydrate();
  return useAdviceStore.getState().favorites;
};

describe('the advice store', () => {
  beforeEach(async () => {
    jest.restoreAllMocks();
    await storage.clearAll();
    useAdviceStore.setState({ hydrated: false, favorites: new Set() });
  });

  it('keeps nothing when there is nothing on disk', async () => {
    expect((await coldStart()).size).toBe(0);
  });

  it('round-trips a favorite through the real save and load paths', async () => {
    await useAdviceStore.getState().toggleFavorite('Finish the small thing before starting the next one.');
    expect([...(await onDisk())]).toEqual(['Finish the small thing before starting the next one.']);
    expect([...(await coldStart())]).toEqual(['Finish the small thing before starting the next one.']);
  });

  it('takes a favorite off the disk when it is unmarked again', async () => {
    const { toggleFavorite } = useAdviceStore.getState();
    await toggleFavorite('a');
    await toggleFavorite('a');
    expect((await onDisk()).size).toBe(0);
    expect((await coldStart()).size).toBe(0);
  });

  it('costs you the favorites, not the room, when the record is corrupt', async () => {
    await storage.set(KEYS.advice, '}{ not json');
    expect((await coldStart()).size).toBe(0);
  });

  // The same bargain the organism store strikes: an unwritable disk must never
  // surface as an unhandled rejection at the void call site.
  it('keeps the favorite for this session when the disk refuses it', async () => {
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('read-only'));
    await expect(useAdviceStore.getState().toggleFavorite('a')).resolves.toBeUndefined();
    expect(useAdviceStore.getState().favorites.has('a')).toBe(true);
  });

  it('reads the disk once however many callers ask', async () => {
    await storage.set(KEYS.advice, JSON.stringify({ favorites: ['a'] }));
    const get = jest.spyOn(storage, 'get');
    useAdviceStore.setState({ hydrated: false, favorites: new Set() });
    const { hydrate } = useAdviceStore.getState();
    await Promise.all([hydrate(), hydrate(), hydrate()]);
    expect(get).toHaveBeenCalledTimes(1);
    expect([...useAdviceStore.getState().favorites]).toEqual(['a']);
  });
});
