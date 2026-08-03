import { KEYS, secure, storage } from '../storage';
import { useFacilityStore } from '../store';
import { buildContext } from '../../vera/context';
import { START_HUNGER } from '../../modules/organism/hunger';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
const { getLocales } = jest.requireMock('expo-localization');

// Only callLlm is faked — AuthError stays the real class, since speech.ts
// checks `instanceof AuthError` against whatever this module exports.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(),
}));
const { callLlm, AuthError } = jest.requireMock('../../vera/llm');

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

  // Finding 1, fix round 1: mem was persisted by speak() but never read back,
  // so the rolling conversational memory silently reset on every cold start.
  it('restores the rolling memory from a saved soul', async () => {
    await soul({
      mem: [{ you: 'hi', her: 'Noted.' }, { you: null, her: 'Hm.' }],
      day: today(),
    });
    await hydrate();
    expect(useFacilityStore.getState().mem).toEqual([
      { you: 'hi', her: 'Noted.' },
      { you: null, her: 'Hm.' },
    ]);
  });

  it('degrades a missing, null, or non-array mem to [] without throwing', async () => {
    await soul({ day: today() }); // mem missing entirely
    await expect(hydrate()).resolves.toBeUndefined();
    expect(useFacilityStore.getState().mem).toEqual([]);

    await soul({ mem: null, day: today() });
    await expect(hydrate()).resolves.toBeUndefined();
    expect(useFacilityStore.getState().mem).toEqual([]);

    await soul({ mem: 'not an array', day: today() });
    await expect(hydrate()).resolves.toBeUndefined();
    expect(useFacilityStore.getState().mem).toEqual([]);
  });

  it('caps a saved mem at six, keeping the newest, not the oldest', async () => {
    const exchanges = Array.from({ length: 9 }, (_, i) => ({ you: `q${i}`, her: `a${i}` }));
    await soul({ mem: exchanges, day: today() });
    await hydrate();
    expect(useFacilityStore.getState().mem).toEqual(exchanges.slice(-6));
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

describe('speak', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    reset();
    callLlm.mockReset();
    await storage.clearAll();
    useFacilityStore.setState({
      apiKey: 'sk-ant-api03-abcdefghijklmnop',
      mem: [], askedAt: Date.now(), lastOpen: null, hunger: START_HUNGER, lastFed: null,
      visits: 1, cleared: 0,
    });
  });

  afterEach(() => {
    // The typewriter reschedules itself one character at a time; run it to
    // completion so nothing dangles into the next test.
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('does nothing without a key', async () => {
    useFacilityStore.setState({ apiKey: '' });
    await useFacilityStore.getState().speak('subject_spoke', 'hi');
    expect(callLlm).not.toHaveBeenCalled();
  });

  it('ignores an overlapping call while one is already in flight', async () => {
    let resolveCall: (value: string) => void = () => {};
    callLlm.mockImplementation(() => new Promise((resolve) => { resolveCall = resolve; }));

    const first = useFacilityStore.getState().speak('subject_spoke', 'hi');
    const second = useFacilityStore.getState().speak('subject_spoke', 'again');
    resolveCall('{"emotion":"calm","line":"Noted."}');
    await Promise.all([first, second]);

    expect(callLlm).toHaveBeenCalledTimes(1);
  });

  it('appends her reply to the log and persists the transcript', async () => {
    callLlm.mockResolvedValue('{"emotion":"amused","line":"Barely."}');
    await useFacilityStore.getState().speak('subject_spoke', 'did you miss me');

    const s = useFacilityStore.getState();
    expect(s.log[s.log.length - 1]).toMatchObject({ who: 'vera', text: 'Barely.', emotion: 'amused' });
    expect(s.thinking).toBe(false);

    const raw = await storage.get(KEYS.transcript);
    expect(JSON.parse(raw as string)).toEqual(s.log);
  });

  it('appends a returned impression, capped and dated', async () => {
    callLlm.mockResolvedValue(
      '{"emotion":"calm","line":"Hm.","impression":"Deflects with questions","seal":true}',
    );
    await useFacilityStore.getState().speak('subject_spoke', 'did you miss me');

    const s = useFacilityStore.getState();
    expect(s.impressions[s.impressions.length - 1]).toMatchObject({
      text: 'Deflects with questions.',
      sealed: true,
    });
    expect(s.impressions[s.impressions.length - 1].at).toMatch(/^[A-Z]{3} \d{2}$/);
  });

  it('persists the soul blob in exactly the shape hydrate reads back', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    useFacilityStore.setState({ visits: 3, lang: 'en', cleared: 1, hunger: 12, lastFed: null });

    await useFacilityStore.getState().speak('subject_spoke', 'where were you');

    const raw = await storage.get(KEYS.soul);
    const saved = JSON.parse(raw as string);
    expect(Object.keys(saved).sort()).toEqual(
      ['cleared', 'day', 'hunger', 'imps', 'lang', 'lastFed', 'lastOpen', 'mem', 'visits'].sort(),
    );
    expect(saved.day).toBe(new Date().toDateString());
    expect(saved.visits).toBe(3);
    expect(saved.lang).toBe('en');
    expect(saved.cleared).toBe(1);
    expect(saved.mem).toEqual([{ you: 'where were you', her: 'Noted.' }]);
  });

  it('falls back to an authored line when the network is dark, without erroring', async () => {
    callLlm.mockRejectedValue(new Error('Network request failed'));
    await expect(useFacilityStore.getState().speak('subject_spoke', 'hi')).resolves.toBeUndefined();
    expect(useFacilityStore.getState().line).toBeTruthy();
  });

  it('leaves the key in place after an auth failure, and still shows a line', async () => {
    callLlm.mockRejectedValue(new AuthError());
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.apiKey).toBe('sk-ant-api03-abcdefghijklmnop');
    expect(s.line).toBeTruthy();
  });

  // Finding 2, fix round 1: a new reply must cancel the previous typewriter
  // outright, not merely outrace it — otherwise the two interleave and
  // corrupt `shown`. Nothing before this asserted the cancellation itself.
  it('cancels an in-flight typewriter so a second reply does not bleed into the first', async () => {
    callLlm.mockResolvedValueOnce('{"emotion":"calm","line":"A long first line here."}');
    await useFacilityStore.getState().speak('subject_spoke', 'one');

    // Advance partway through the first line's typewriter — shown is mid-word.
    jest.advanceTimersByTime(16 * 5);
    expect(useFacilityStore.getState().shown).toBe('A lon');

    // A second reply starts before the first typewriter finishes.
    callLlm.mockResolvedValueOnce('{"emotion":"calm","line":"Short."}');
    await useFacilityStore.getState().speak('subject_spoke', 'two');

    jest.runAllTimers();
    expect(useFacilityStore.getState().shown).toBe('Short.');
  });

  // Finding 1, fix round 1: the regression guard. mem must not just be
  // written to disk — it must come back out and reach the next context, or
  // her short-term continuity resets every launch despite the persisted file.
  it('round-trips mem through a restart into the next buildContext call', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'where were you');

    // Simulate a cold start: hydrate reads back exactly what speak persisted.
    useFacilityStore.setState({ hydrated: false, mem: [] });
    await useFacilityStore.getState().hydrate();

    const { mem } = useFacilityStore.getState();
    expect(mem).toEqual([{ you: 'where were you', her: 'Noted.' }]);

    const ctx = buildContext({
      now: new Date(),
      lastOpen: null,
      askedAt: Date.now(),
      visits: 1,
      hunger: START_HUNGER,
      cleared: 0,
      mem,
      impressions: [],
    });
    expect(ctx.recent_exchanges).toEqual([{ you: 'where were you', her: 'Noted.' }]);
  });
});

describe('setLang', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    reset();
    callLlm.mockReset();
    await storage.clearAll();
    await secure.remove();
    useFacilityStore.setState({
      apiKey: 'sk-ant-api03-abcdefghijklmnop',
      mem: [], askedAt: Date.now(), lastOpen: null, hunger: START_HUNGER, lastFed: null,
      visits: 1, cleared: 0, lang: 'en',
    });
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('persists the soul blob in exactly the shape hydrate reads back', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    useFacilityStore.setState({
      visits: 5, cleared: 2,
      impressions: [{ text: 'Deflects.', at: 'JUL 30', sealed: false }],
    });

    await useFacilityStore.getState().setLang('ko');

    const raw = await storage.get(KEYS.soul);
    const saved = JSON.parse(raw as string);
    expect(Object.keys(saved).sort()).toEqual(
      ['cleared', 'day', 'hunger', 'imps', 'lang', 'lastFed', 'lastOpen', 'mem', 'visits'].sort(),
    );
    expect(saved.lang).toBe('ko');
    expect(saved.visits).toBe(5);
    expect(saved.cleared).toBe(2);
    expect(saved.imps).toEqual([{ text: 'Deflects.', at: 'JUL 30', sealed: false }]);
  });

  // The regression this guards: a stale-shape write that hydrate cannot read
  // back would silently lose the switched language on the next cold start.
  it('round-trips the switched language through a restart', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().setLang('ko');
    expect(useFacilityStore.getState().lang).toBe('ko');

    // Simulate a cold start: hydrate reads back exactly what setLang persisted.
    useFacilityStore.setState({ hydrated: false, lang: 'en' });
    await useFacilityStore.getState().hydrate();

    expect(useFacilityStore.getState().lang).toBe('ko');
  });

  // speak() no-ops without a key, so a dormant subject switching languages
  // would lose the change on restart if setLang relied on speak() to persist it.
  it('persists the new language even when she is dormant and speak() no-ops', async () => {
    useFacilityStore.setState({ apiKey: '' });
    await useFacilityStore.getState().setLang('ko');

    expect(callLlm).not.toHaveBeenCalled();
    const raw = await storage.get(KEYS.soul);
    expect(JSON.parse(raw as string).lang).toBe('ko');

    useFacilityStore.setState({ hydrated: false, lang: 'en' });
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().lang).toBe('ko');
  });
});
