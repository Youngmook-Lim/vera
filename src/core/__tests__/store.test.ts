import { KEYS, secure, storage } from '../storage';
import { useFacilityStore } from '../store';
import { START_HUNGER } from '../../modules/organism/hunger';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
const { getLocales } = jest.requireMock('expo-localization');

// The OS keystore has no jsdom implementation; an in-memory vault is enough to
// pin the one invariant that matters — a key in the keystore wakes her.
jest.mock('expo-secure-store', () => {
  const vault = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (k: string) => vault.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => {
      vault.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => {
      vault.delete(k);
    }),
  };
});

const reset = () =>
  useFacilityStore.setState({
    view: 'stage', cabinetOpen: false, keyPanelOpen: false, confirmingClear: false,
    apiKey: '', emotion: 'dormant', line: '', shown: '', thinking: false, draft: '',
    log: [], impressions: [], cleared: 0, visits: 1, lang: 'en',
  });

describe('the router', () => {
  beforeEach(reset);

  it('starts on the stage, dormant', () => {
    const s = useFacilityStore.getState();
    expect(s.view).toBe('stage');
    expect(s.emotion).toBe('dormant');
    expect(s.apiKey).toBe('');
  });

  it('moves between views', () => {
    useFacilityStore.getState().setView('sys');
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('closes the cabinet when a room opens', () => {
    useFacilityStore.setState({ cabinetOpen: true });
    useFacilityStore.getState().setView('mod02');
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
  });
});

describe('stepBack', () => {
  beforeEach(reset);

  it('closes the cabinet before it changes view', () => {
    useFacilityStore.setState({ cabinetOpen: true, view: 'stage' });
    expect(useFacilityStore.getState().stepBack()).toBe(true);
    expect(useFacilityStore.getState().cabinetOpen).toBe(false);
    expect(useFacilityStore.getState().view).toBe('stage');
  });

  it('closes the key panel before it changes view', () => {
    useFacilityStore.setState({ keyPanelOpen: true, view: 'sys' });
    expect(useFacilityStore.getState().stepBack()).toBe(true);
    expect(useFacilityStore.getState().keyPanelOpen).toBe(false);
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('steps a file back to system, not all the way home', () => {
    useFacilityStore.setState({ view: 'mem' });
    useFacilityStore.getState().stepBack();
    expect(useFacilityStore.getState().view).toBe('sys');

    useFacilityStore.setState({ view: 'soul' });
    useFacilityStore.getState().stepBack();
    expect(useFacilityStore.getState().view).toBe('sys');
  });

  it('steps every other view back to the stage', () => {
    for (const view of ['sys', 'log', 'mod01', 'mod02'] as const) {
      useFacilityStore.setState({ view });
      expect(useFacilityStore.getState().stepBack()).toBe(true);
      expect(useFacilityStore.getState().view).toBe('stage');
    }
  });

  it('lets the OS exit from the stage', () => {
    useFacilityStore.setState({ view: 'stage' });
    expect(useFacilityStore.getState().stepBack()).toBe(false);
  });
});

describe('hydrate', () => {
  const today = () => new Date().toDateString();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const soul = (o: Record<string, unknown>) => storage.set(KEYS.soul, JSON.stringify(o));
  const hydrate = () => useFacilityStore.getState().hydrate();

  beforeEach(async () => {
    jest.restoreAllMocks();
    getLocales.mockReturnValue([{ languageCode: 'en' }]);
    await storage.clearAll();
    await secure.remove();
    reset();
    useFacilityStore.setState({
      hydrated: false, lastOpen: null, hunger: START_HUNGER, lastFed: null, waking: false,
    });
  });

  it('restores lang, impressions and cleared from a saved soul', async () => {
    await soul({
      lang: 'ko',
      imps: [{ text: 'You are late again.', at: 'MAR 02', sealed: false }],
      cleared: 3,
      visits: 4,
      day: today(),
      lastOpen: Date.now() - 600_000,
    });

    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.lang).toBe('ko');
    expect(s.impressions).toEqual([{ text: 'You are late again.', at: 'MAR 02', sealed: false }]);
    expect(s.cleared).toBe(3);
    expect(s.visits).toBe(5); // same day, not a reload
  });

  it('falls back to the device locale only when nothing is saved', async () => {
    getLocales.mockReturnValue([{ languageCode: 'ko' }]);
    await hydrate();
    expect(useFacilityStore.getState().lang).toBe('ko');

    await soul({ lang: 'en' });
    await hydrate();
    expect(useFacilityStore.getState().lang).toBe('en'); // saved beats the device
  });

  it('counts a return on the same day, and caps the tally at 99', async () => {
    await soul({ visits: 7, day: today(), lastOpen: Date.now() - 600_000 });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(8);

    await soul({ visits: 99, day: today(), lastOpen: Date.now() - 600_000 });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(99);
  });

  it('starts the tally over on a new day', async () => {
    await soul({ visits: 40, day: 'Wed Jan 07 2026', lastOpen: Date.now() - 600_000 });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(1);
  });

  it('treats a remount inside two minutes as a reload, not a return', async () => {
    const lastOpen = Date.now() - 1_000;
    await soul({ visits: 5, day: today(), lastOpen });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(5);
    expect(useFacilityStore.getState().lastOpen).toBe(lastOpen);
  });

  it('rehydrates hunger as stored-plus-drift, not the stored number', async () => {
    await soul({ hunger: 40, lastFed: hoursAgo(10), day: today() });
    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hunger).toBeGreaterThan(40); // hungrier than you left it
    expect(s.hunger).toBeCloseTo(40 + 10 * 2.5, 1); // DRIFT_PER_HOUR = 2.5
    expect(s.lastFed).not.toBeNull();
  });

  it('degrades a corrupt soul blob to defaults rather than dying', async () => {
    await storage.set(KEYS.soul, '{{{not json');
    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.lang).toBe('en');
    expect(s.impressions).toEqual([]);
    expect(s.cleared).toBe(0);
    expect(s.visits).toBe(1);
    expect(s.hunger).toBe(START_HUNGER);
    expect(s.lastFed).toBeNull();
  });

  it('keeps her awake when the transcript is corrupt — the key is not collateral', async () => {
    await secure.set('sk-ant-api03-xxx');
    await soul({ lang: 'ko', cleared: 2, day: today() });
    await storage.set(KEYS.transcript, '[{"who":"you","text":"tru');

    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.apiKey).toBe('sk-ant-api03-xxx');
    expect(s.emotion).toBe('calm'); // NOT dormant
    expect(s.log).toEqual([]); // only the mangled store is lost
    expect(s.lang).toBe('ko'); // the soul blob survives its neighbour
    expect(s.cleared).toBe(2);
  });

  it('keeps her awake when the disk itself is unreadable', async () => {
    await secure.set('sk-ant-api03-xxx');
    jest.spyOn(storage, 'get').mockRejectedValue(new Error('disk failure'));

    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.apiKey).toBe('sk-ant-api03-xxx');
    expect(s.emotion).toBe('calm');
  });

  it('reads the transcript back, newest kept', async () => {
    await storage.set(
      KEYS.transcript,
      JSON.stringify([{ who: 'you', text: 'hello', t: 1 }, { who: 'vera', text: 'no', t: 2 }]),
    );
    await hydrate();
    expect(useFacilityStore.getState().log).toHaveLength(2);
  });

  it('stays dormant with no key, and wakes calm with one', async () => {
    await hydrate();
    expect(useFacilityStore.getState().apiKey).toBe('');
    expect(useFacilityStore.getState().emotion).toBe('dormant');

    await secure.set('sk-ant-api03-xxx');
    await hydrate();
    expect(useFacilityStore.getState().apiKey).toBe('sk-ant-api03-xxx');
    expect(useFacilityStore.getState().emotion).toBe('calm');
  });
});

describe('activate', () => {
  beforeEach(async () => {
    reset();
    await secure.remove();
    useFacilityStore.setState({ waking: false });
  });

  it('returns false and leaves apiKey empty when the key is rejected', async () => {
    const ok = await useFacilityStore.getState().activate('nope');
    expect(ok).toBe(false);
    expect(useFacilityStore.getState().apiKey).toBe('');
  });

  it('returns true when the key is accepted', async () => {
    const ok = await useFacilityStore.getState().activate('sk-ant-api03-abcdefghijklmnop');
    expect(ok).toBe(true);
    expect(useFacilityStore.getState().apiKey).toBe('sk-ant-api03-abcdefghijklmnop');
  });

  // A caller replacing an existing key (Task 14) must not read a good key as
  // a rejection just because it wasn't the first activation — and she should
  // not visibly "wake up" again for a transplant.
  it('returns true, not false, when a valid key replaces an existing one, and does not re-wake her', async () => {
    const first = await useFacilityStore.getState().activate('sk-ant-api03-abcdefghijklmnop');
    expect(first).toBe(true);
    expect(useFacilityStore.getState().waking).toBe(true);

    const second = await useFacilityStore.getState().activate('sk-ant-api03-zyxwvutsrqponmlk');
    expect(second).toBe(true);
    expect(useFacilityStore.getState().apiKey).toBe('sk-ant-api03-zyxwvutsrqponmlk');
    expect(useFacilityStore.getState().waking).toBe(false); // she does not notice a transplant
  });
});
