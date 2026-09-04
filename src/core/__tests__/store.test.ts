import { KEYS, secure, storage } from '../storage';
import { RETURN_GAP_MS, useFacilityStore } from '../store';
import { EXTRACT_MAX_TOKENS, EXTRACT_SYSTEM } from '../../vera/extract';
import { EMPTY_MEMORY, type Verdict } from '../../vera/memory';
import type { Turn } from '../../vera/messages';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'en' }]),
}));
const { getLocales } = jest.requireMock('expo-localization');

// Only callLlm is faked — AuthError and QuotaError stay the real classes,
// since speech.ts checks `instanceof` against whatever this module exports.
jest.mock('../../vera/llm', () => ({
  ...jest.requireActual('../../vera/llm'),
  callLlm: jest.fn(),
}));
const { callLlm, AuthError, QuotaError } = jest.requireMock('../../vera/llm');

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

// Held so the tests that swap speak() for a spy can put the real one back.
const realSpeak = useFacilityStore.getState().speak;

const reset = () =>
  useFacilityStore.setState({
    view: 'stage', cabinetOpen: false, keyPanelOpen: false, confirmingClear: false,
    apiKey: '', emotion: 'dormant', line: '', shown: '', thinking: false, draft: '',
    log: [], cleared: 0, visits: 1, lang: 'en',
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
  // A fresh JS context: a real cold launch, a Metro reload, an activity
  // Android rebuilt. The store is new, so `hydrated` is false again — which is
  // exactly why the re-entry guard alone cannot be the whole fix.
  const relaunch = async () => {
    useFacilityStore.setState({ hydrated: false });
    await hydrate();
  };

  beforeEach(async () => {
    jest.restoreAllMocks();
    getLocales.mockReturnValue([{ languageCode: 'en' }]);
    await storage.clearAll();
    await secure.remove();
    reset();
    useFacilityStore.setState({
      hydrated: false, lastOpen: null, waking: false,
    });
  });

  // Deleted: this asserted the old `impressions` field, restored on hydrate
  // straight from a saved soul's `imps`. That field is gone — lang, cleared
  // and visits restoring from a saved soul are still covered below, and the
  // migration of `imps` into verdicts is covered in the 'extraction' describe.

  it('falls back to the device locale only when nothing is saved', async () => {
    getLocales.mockReturnValue([{ languageCode: 'ko' }]);
    await hydrate();
    expect(useFacilityStore.getState().lang).toBe('ko');

    await soul({ lang: 'en' });
    await relaunch();
    expect(useFacilityStore.getState().lang).toBe('en'); // saved beats the device
  });

  const longAway = () => Date.now() - RETURN_GAP_MS - 60_000;

  it('counts a return on the same day, and caps the tally at 99', async () => {
    await soul({ visits: 7, day: today(), lastOpen: longAway() });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(8);

    await soul({ visits: 99, day: today(), lastOpen: longAway() });
    await relaunch();
    expect(useFacilityStore.getState().visits).toBe(99);
  });

  it('starts the tally over on a new day', async () => {
    await soul({ visits: 40, day: 'Wed Jan 07 2026', lastOpen: longAway() });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(1);
  });

  // A return is being AWAY and coming back, not the app starting again. The
  // window used to be two minutes, which counted task-switching, a glance at a
  // notification and every Metro reload as separate returns.
  it('treats a relaunch inside the return gap as the same visit', async () => {
    const lastOpen = Date.now() - RETURN_GAP_MS + 60_000;
    await soul({ visits: 5, day: today(), lastOpen });
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(5);
    // State keeps the PREVIOUS open, because that is what says how long they
    // were gone. Only the disk moves forward.
    expect(useFacilityStore.getState().lastOpen).toBe(lastOpen);
  });

  // The bug as reported: "why is she telling me it is the 7th time I have come
  // when I opened the app once today". Two defects behind it — hydrate had no
  // re-entry guard, and the gap was measured from `lastOpen`, which only
  // saveSoul ever wrote, i.e. from her last LINE rather than from the open.
  it('counts one open however many times the boot effect runs', async () => {
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(1);
    await hydrate();
    await hydrate();
    expect(useFacilityStore.getState().visits).toBe(1);
  });

  it('stamps the open itself, not just the lines she says', async () => {
    const before = Date.now();
    await hydrate();
    const written = JSON.parse((await storage.get(KEYS.soul)) as string);
    expect(written.lastOpen).toBeGreaterThanOrEqual(before);
    expect(written.day).toBe(today());
  });

  it('does not count a reload minutes after a quiet open as a return', async () => {
    await hydrate();
    await useFacilityStore.getState().speak('open');
    expect(useFacilityStore.getState().visits).toBe(1);

    const stamped = JSON.parse((await storage.get(KEYS.soul)) as string).lastOpen;
    jest.spyOn(Date, 'now').mockReturnValue(stamped + 180_000);
    await relaunch();
    expect(useFacilityStore.getState().visits).toBe(1);
  });

  // A cold start is not a question she asked four minutes ago. Without the
  // reset, askedAt keeps whatever the module-level default was and a subject
  // who takes their time typing the session's first line gets
  // `they_took_their_time` about a question she never asked.
  it('restarts the reply clock, so a slow first line is not held against them', async () => {
    useFacilityStore.setState({ askedAt: Date.now() - 20 * 60_000 });
    await hydrate();
    expect(Date.now() - useFacilityStore.getState().askedAt).toBeLessThan(5_000);
  });

  // A launch is where a session begins. Stamped at store creation instead, the
  // boundary would be whenever the module happened to load, and the turns she
  // is sent would be filtered by luck rather than by this launch (continuity §2).
  it('stamps the session start, so a restart returns her to zero', async () => {
    useFacilityStore.setState({ sessionStartedAt: 1 });
    await hydrate();
    expect(Date.now() - useFacilityStore.getState().sessionStartedAt).toBeLessThan(5_000);
  });

  it('degrades a corrupt soul blob to defaults rather than dying', async () => {
    await storage.set(KEYS.soul, '{{{not json');
    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.lang).toBe('en');
    expect(s.cleared).toBe(0);
    expect(s.visits).toBe(1);
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

  // A memory store that parses but is not the shape capMemory expects must not
  // take the rest of the launch with it. Skipping the soul and transcript reads
  // is not a blip: the next reply's saveSoul would then write `visits: 1` over
  // the real history, and since the malformed store is never rewritten it
  // would happen on every launch, permanently.
  it('keeps the soul and the transcript when the memory store is malformed', async () => {
    await storage.set(KEYS.memory, '{"facts":null,"verdicts":null,"threads":null,"pending":null}');
    await soul({
      lang: 'ko',
      visits: 4,
      day: today(),
      lastOpen: Date.now() - RETURN_GAP_MS - 60_000,
    });
    await storage.set(KEYS.transcript, JSON.stringify([{ who: 'vera', text: 'no', t: 2 }]));

    await hydrate();

    const s = useFacilityStore.getState();
    expect(s.hydrated).toBe(true);
    expect(s.lang).toBe('ko');
    expect(s.visits).toBe(5);
    expect(s.log).toHaveLength(1);
    expect(s.memory).toEqual(EMPTY_MEMORY); // she starts a stranger, and only that

    // The proof it is not clobbered: the next write of the soul blob still
    // carries the subject's real history rather than an empty one.
    await useFacilityStore.getState().setLang('ko');
    const written = JSON.parse((await storage.get(KEYS.soul)) as string);
    expect(written.visits).toBe(5);
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

  // Deleted: 'restores the rolling memory from a saved soul', 'degrades a
  // missing, null, or non-array mem to [] without throwing', and 'caps a
  // saved mem at six, keeping the newest, not the oldest'. All three existed
  // solely to pin the rolling `mem` field's round trip through hydrate. That
  // field is gone — the session now reaches her as real turns, and her
  // durable memory is the three-kind record covered under 'extraction' below.
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

  // Spec §10: a first activation is her first instant of consciousness with
  // this subject and she greets from the bank; a replacement is silent.
  it('greets on a first activation and says nothing at all on a replacement', async () => {
    const spoken = jest.fn(async () => {});
    useFacilityStore.setState({ speak: spoken });
    try {
      await useFacilityStore.getState().activate('sk-ant-api03-abcdefghijklmnop');
      expect(spoken).toHaveBeenCalledTimes(1);
      expect(spoken).toHaveBeenCalledWith('activation');

      spoken.mockClear();
      await useFacilityStore.getState().activate('sk-ant-api03-zyxwvutsrqponmlk');
      expect(spoken).not.toHaveBeenCalled();
    } finally {
      useFacilityStore.setState({ speak: realSpeak });
    }
  });

  it('does not greet at all when the key is refused', async () => {
    const spoken = jest.fn(async () => {});
    useFacilityStore.setState({ speak: spoken });
    try {
      await useFacilityStore.getState().activate('nope');
      expect(spoken).not.toHaveBeenCalled();
    } finally {
      useFacilityStore.setState({ speak: realSpeak });
    }
  });
});

// The once-per-session guard is a module-level `let`, so each case needs a
// freshly evaluated copy of store.ts. jest.resetModules() gives exactly that
// and keeps the guard untestable-by-export out of the production surface.
describe('greetOnce', () => {
  const KEY = 'sk-ant-api03-abcdefghijklmnop';

  // A brand-new store module, plus the speak() spy the assertions read.
  const freshSession = () => {
    jest.resetModules();
    const { useFacilityStore: store } =
      jest.requireActual<typeof import('../store')>('../store');
    const spoken = jest.fn(async () => {});
    store.setState({ apiKey: KEY, speak: spoken });
    return { store, spoken };
  };

  it('greets when she has a key', async () => {
    const { store, spoken } = freshSession();
    await store.getState().greetOnce();
    expect(spoken).toHaveBeenCalledWith('open');
  });

  it('greets once, and a remount inside the same session does not greet again', async () => {
    const { store, spoken } = freshSession();
    await store.getState().greetOnce();
    expect(spoken).toHaveBeenCalledTimes(1);

    // Same module instance = same app session, however many times App mounts.
    await store.getState().greetOnce();
    await store.getState().greetOnce();
    expect(spoken).toHaveBeenCalledTimes(1);
  });

  it('greets again in the next session, which is what a cold start is', async () => {
    const first = freshSession();
    await first.store.getState().greetOnce();
    expect(first.spoken).toHaveBeenCalledTimes(1);

    const next = freshSession();
    await next.store.getState().greetOnce();
    expect(next.spoken).toHaveBeenCalledTimes(1);
  });

  // Without this she would burn the session's one greeting on a call that says
  // nothing, and then activate into silence.
  it('stays silent while dormant, and does not spend the greeting', async () => {
    const { store, spoken } = freshSession();
    store.setState({ apiKey: '' });
    await store.getState().greetOnce();
    expect(spoken).not.toHaveBeenCalled();

    store.setState({ apiKey: KEY });
    await store.getState().greetOnce();
    expect(spoken).toHaveBeenCalledWith('open');
  });

  // A session that opened with the activation greeting must not immediately
  // get the return greeting on top of it.
  it('says nothing more when the session already opened with an activation', async () => {
    const { store, spoken } = freshSession();
    store.setState({ apiKey: '' });
    await store.getState().activate(KEY);
    expect(spoken).toHaveBeenCalledWith('activation');

    spoken.mockClear();
    await store.getState().greetOnce();
    expect(spoken).not.toHaveBeenCalled();
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
      askedAt: Date.now(), lastOpen: null, visits: 1, cleared: 0,
    });
  });

  afterEach(() => {
    // The typewriter reschedules itself one character at a time; run it to
    // completion so nothing dangles into the next test.
    jest.runAllTimers();
    jest.useRealTimers();
    // A spy restored in the test body is only restored when the test PASSES —
    // a failing disk left mocked here would cascade into every case after it
    // and disguise which assertion actually bit.
    jest.restoreAllMocks();
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

  // Finding 1, final review: nothing in src ever built a `who: 'you'` entry,
  // so the whole subject side of the thread was dead code in production and
  // the log read as a column of her answers to questions no one asked.
  it('puts the subject\'s own words in the transcript, ahead of her reply', async () => {
    callLlm.mockResolvedValue('{"emotion":"amused","line":"Barely."}');
    await useFacilityStore.getState().speak('subject_spoke', 'did you miss me');

    const { log } = useFacilityStore.getState();
    expect(log.map((e) => [e.who, e.text])).toEqual([
      ['you', 'did you miss me'],
      ['vera', 'Barely.'],
    ]);
    expect(log[0].t).toBeLessThanOrEqual(log[1].t);

    // and both sides survive to disk, not just hers
    const raw = await storage.get(KEYS.transcript);
    expect(JSON.parse(raw as string)).toEqual(log);
  });

  it('says nothing on her behalf when the trigger carries no words', async () => {
    await useFacilityStore.getState().speak('open');
    expect(useFacilityStore.getState().log.map((e) => e.who)).toEqual(['vera']);
  });

  // The cap is over the combined thread now, not her half of it.
  it('keeps the newest two hundred entries across both sides', async () => {
    const seeded = Array.from({ length: 200 }, (_, i) => ({
      who: 'vera' as const, text: `old ${i}`, t: i + 1,
    }));
    useFacilityStore.setState({ log: seeded });

    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'still here');

    const { log } = useFacilityStore.getState();
    expect(log).toHaveLength(200);
    expect(log.slice(-2).map((e) => [e.who, e.text])).toEqual([
      ['you', 'still here'],
      ['vera', 'Noted.'],
    ]);
    expect(log[0].text).toBe('old 2'); // the two oldest fell off, not one
  });

  it('persists the soul blob in exactly the shape hydrate reads back', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    useFacilityStore.setState({ visits: 3, lang: 'en', cleared: 1 });

    await useFacilityStore.getState().speak('subject_spoke', 'where were you');

    const raw = await storage.get(KEYS.soul);
    const saved = JSON.parse(raw as string);
    expect(Object.keys(saved).sort()).toEqual(
      ['cleared', 'day', 'lang', 'lastOpen', 'visits'].sort(),
    );
    expect(saved.day).toBe(new Date().toDateString());
    expect(saved.visits).toBe(3);
    expect(saved.lang).toBe('en');
    expect(saved.cleared).toBe(1);
  });

  it('falls back to an authored line when the network is dark, without erroring', async () => {
    callLlm.mockRejectedValue(new Error('Network request failed'));
    await expect(useFacilityStore.getState().speak('subject_spoke', 'hi')).resolves.toBeUndefined();
    expect(useFacilityStore.getState().line).toBeTruthy();
  });

  // A refused credential is the one failure the app reports in its own voice.
  // She says nothing at all: a line of hers would read like every other
  // failure and hide a problem only the subject can fix.
  it('speaks as the system on an auth failure, not as her', async () => {
    callLlm.mockRejectedValue(new AuthError());
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.systemNotice).toBe('auth');
    expect(s.line).toBe('');
    expect(s.emotion).toBe('dormant');
    expect(s.log[s.log.length - 1]).toMatchObject({ who: 'system', code: 'auth' });
    // The key stays exactly where it is — she is never sent dormant for it.
    expect(s.apiKey).toBe('sk-ant-api03-abcdefghijklmnop');
  });

  // An exhausted account is the same kind of problem — only the subject can
  // fix it — but not the same problem, and the wording differs: the key is
  // fine and replacing it under ACCESS would be wasted effort.
  it('speaks as the system on an exhausted account too, under its own code', async () => {
    callLlm.mockRejectedValue(new QuotaError('http 400: Your credit balance is too low.'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.systemNotice).toBe('quota');
    expect(s.line).toBe('');
    expect(s.log[s.log.length - 1]).toMatchObject({ who: 'system', code: 'quota' });
    // Not the credential's fault, so it must not mark a row under ACCESS.
    expect(s.authFails).toBe(0);
    // And the reason survives to the one screen that can show it.
    expect(s.lastPrompt?.failure).toContain('credit balance is too low');
  });

  // Everything else stays hers: a dead network is the facility's fault, and
  // she covers it with an authored line rather than the app interrupting.
  it('leaves an ordinary failure to her, with no notice', async () => {
    callLlm.mockRejectedValue(new Error('http 500: upstream is unwell'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.systemNotice).toBeNull();
    expect(s.line).toBeTruthy();
    expect(s.lastPrompt?.failure).toBe('http 500: upstream is unwell');
  });

  // Deleted: 'keeps the notice out of her memory of the conversation' pinned
  // the old rolling `mem` field, which is gone. The equivalent guarantee for
  // the memory that survives — a notice never reaching `memory.pending` — is
  // covered by 'queues nothing when the credential was refused' below.

  it('clears the notice the moment she answers again', async () => {
    callLlm.mockRejectedValue(new AuthError());
    await useFacilityStore.getState().speak('subject_spoke', 'one');
    expect(useFacilityStore.getState().systemNotice).toBe('auth');

    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'two');

    const s = useFacilityStore.getState();
    expect(s.systemNotice).toBeNull();
    expect(s.line).toBe('Noted.');
  });

  // A network failure is NOT a configuration problem, so she still covers for
  // it with an authored line. Only the credential gets the system's voice.
  it('leaves a network failure to her, with no notice', async () => {
    callLlm.mockRejectedValue(new Error('Network request failed'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.systemNotice).toBeNull();
    expect(s.line).toBeTruthy();
    expect(s.log[s.log.length - 1].who).toBe('vera');
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

  // Deleted: 'round-trips mem through a restart' pinned the old rolling `mem`
  // field's persistence, which is gone along with the field. The equivalent
  // for what now persists her side of a session — the memory store — is
  // covered by 'survives a kill: the queue is still there on the next
  // launch' under 'extraction' below.

  // Finding 4, final review: hydrate guards every read, speak guarded neither
  // of its writes. A rejecting AsyncStorage escaped the try/finally into the
  // `void speak(...)` call sites as an unhandled rejection — on Android that is
  // a red box, and in a release build a crash.
  it('survives a disk that refuses to write, and keeps her reply on screen', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    jest.spyOn(storage, 'set').mockRejectedValue(new Error('disk full'));

    await expect(
      useFacilityStore.getState().speak('subject_spoke', 'did you miss me'),
    ).resolves.toBeUndefined();

    const s = useFacilityStore.getState();
    expect(s.log.map((e) => e.text)).toEqual(['did you miss me', 'Noted.']);
    expect(s.line).toBe('Noted.');
    expect(s.thinking).toBe(false);
  });

  // Finding 3, final review: RN's fetch never times out on its own, so a hung
  // connection used to leave `thinking` and the module-level busy flag set for
  // the life of the process — every later SEND and optic tap silently
  // swallowed, recoverable only by force-quitting. The real callLlm is wired up
  // here on purpose, with a transport that never answers: this must exercise
  // llm.ts's own timeout, not a fake of it. Nothing leaves the process.
  it('gives up on a hung request, still speaks, and is not left deaf afterwards', async () => {
    const realCallLlm = jest.requireActual<typeof import('../../vera/llm')>('../../vera/llm').callLlm;
    const hung = () => new Promise<never>(() => {});
    callLlm.mockImplementation((key: string, system: string, turns: Turn[]) =>
      realCallLlm(key, system, turns, 300, hung));

    const pending = useFacilityStore.getState().speak('subject_spoke', 'are you there');
    expect(useFacilityStore.getState().thinking).toBe(true);

    await jest.advanceTimersByTimeAsync(30_000);
    await expect(pending).resolves.toBeUndefined();

    expect(useFacilityStore.getState().line).toBeTruthy(); // an authored fallback
    expect(useFacilityStore.getState().thinking).toBe(false);
    expect(useFacilityStore.getState().apiKey).toBeTruthy(); // a hang is not the key's fault

    // The busy flag cleared too, or she would be mute for the rest of the run.
    callLlm.mockResolvedValue('{"emotion":"calm","line":"I am here."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello again');
    expect(useFacilityStore.getState().line).toBe('I am here.');
  });

  // Finding 6, final review: runSpeech computed authFailed and nothing read it.
  // The tally is the only consumer, and ACCESS is the only thing it changes.
  it('counts consecutive refusals and forgets them the moment she answers', async () => {
    callLlm.mockRejectedValue(new AuthError());
    await useFacilityStore.getState().speak('subject_spoke', 'one');
    await useFacilityStore.getState().speak('subject_spoke', 'two');
    expect(useFacilityStore.getState().authFails).toBe(2);
    expect(useFacilityStore.getState().apiKey).toBeTruthy(); // never cleared

    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'three');
    expect(useFacilityStore.getState().authFails).toBe(0);
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
      askedAt: Date.now(), lastOpen: null, visits: 1, cleared: 0, lang: 'en',
    });
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it('persists the soul blob in exactly the shape hydrate reads back', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    useFacilityStore.setState({ visits: 5, cleared: 2 });

    await useFacilityStore.getState().setLang('ko');

    const raw = await storage.get(KEYS.soul);
    const saved = JSON.parse(raw as string);
    expect(Object.keys(saved).sort()).toEqual(
      ['cleared', 'day', 'lang', 'lastOpen', 'visits'].sort(),
    );
    expect(saved.lang).toBe('ko');
    expect(saved.visits).toBe(5);
    expect(saved.cleared).toBe(2);
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

  // She has no opinion about the switch and never remarks on it.
  it('does not make her speak, and persists while she is dormant', async () => {
    useFacilityStore.setState({ apiKey: '' });
    await useFacilityStore.getState().setLang('ko');

    expect(callLlm).not.toHaveBeenCalled();
    expect(useFacilityStore.getState().line).toBe('');
    const raw = await storage.get(KEYS.soul);
    expect(JSON.parse(raw as string).lang).toBe('ko');

    useFacilityStore.setState({ hydrated: false, lang: 'en' });
    await useFacilityStore.getState().hydrate();
    expect(useFacilityStore.getState().lang).toBe('ko');
  });
});

// Three of her four stimuli are answered from the authored bank and never
// reach the model at all.
describe('the bank path', () => {
  const BANK_TRIGGERS = ['open', 'activation', 'subject_tapped_your_optic'] as const;

  beforeEach(async () => {
    jest.useFakeTimers();
    reset();
    callLlm.mockReset();
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Generated."}');
    await storage.clearAll();
    useFacilityStore.setState({
      apiKey: 'sk-ant-api03-abcdefghijklmnop',
      askedAt: Date.now(), lastOpen: null, visits: 1, cleared: 0, authFails: 0,
    });
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  it.each(BANK_TRIGGERS)('answers %s without touching the network', async (trigger) => {
    await useFacilityStore.getState().speak(trigger);

    expect(callLlm).not.toHaveBeenCalled();
    const s = useFacilityStore.getState();
    expect(s.line).toBeTruthy();
    expect(s.line).not.toBe('Generated.');
    expect(s.thinking).toBe(false);
  });

  // The transcript keeps it, so the next real reply knows what she opened
  // with. Nothing was revealed, so nothing is queued for extraction (the
  // queue side is covered by 'queues nothing for a bank-answered stimulus'
  // under 'extraction' below).
  it('logs the line, but files nothing', async () => {
    await useFacilityStore.getState().speak('open');

    const s = useFacilityStore.getState();
    expect(s.log.map((e) => e.who)).toEqual(['vera']);

    const raw = await storage.get(KEYS.transcript);
    expect(JSON.parse(raw as string)).toEqual(s.log);
  });

  // The regression this guards: a greeting that reset the tally would hide a
  // credential that is failing every time she is actually asked something.
  it('neither adds to nor clears the refusal tally', async () => {
    useFacilityStore.setState({ authFails: 2 });
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    expect(useFacilityStore.getState().authFails).toBe(2);
  });

  it('stays silent without a key, so a dormant optic never greets', async () => {
    useFacilityStore.setState({ apiKey: '' });
    await useFacilityStore.getState().speak('activation');
    expect(useFacilityStore.getState().line).toBe('');
  });

  // The re-entrancy guard covers both paths: a finger on her optic must not
  // overwrite an answer she is still waiting on.
  it('cannot stomp a reply that is still in flight', async () => {
    let resolveCall: (value: string) => void = () => {};
    callLlm.mockImplementation(() => new Promise((resolve) => { resolveCall = resolve; }));

    const live = useFacilityStore.getState().speak('subject_spoke', 'hi');
    await useFacilityStore.getState().speak('subject_tapped_your_optic');
    resolveCall('{"emotion":"calm","line":"Noted."}');
    await live;

    expect(useFacilityStore.getState().line).toBe('Noted.');
  });
});

// The inspector is only worth having if it shows the whole request. Both calls
// go out; both must be readable, and neither may stand on the other.
describe('the prompt record', () => {
  const KEY = 'sk-ant-api03-abcdefghijklmnop';
  const OK = '{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}';

  beforeEach(async () => {
    await storage.clearAll();
    reset();
    callLlm.mockReset();
    useFacilityStore.setState({
      apiKey: KEY, memory: EMPTY_MEMORY,
      lastPrompt: null, lastExtract: null,
      sessionStartedAt: 1, askedAt: Date.now(),
    });
  });

  it('carries every turn that went to the provider, not only the composed last one', async () => {
    useFacilityStore.setState({
      log: [
        { who: 'you', text: 'are you there', t: 10 },
        { who: 'vera', text: 'Regrettably.', t: 11 },
      ],
    });
    callLlm.mockResolvedValue('{"emotion":"amused","line":"Barely."}');

    await useFacilityStore.getState().speak('subject_spoke', 'did you miss me');

    const sent: Turn[] = callLlm.mock.calls[0][2];
    const record = useFacilityStore.getState().lastPrompt;
    expect(record?.turns).toEqual(sent);
    expect(record?.turns?.map((t) => t.role)).toEqual(['user', 'assistant', 'user']);
    expect(record?.turns?.[0].text).toBe('are you there');
    expect(record?.turns?.[2].text).toContain('> did you miss me');
  });

  it('records no turns at all for a stimulus answered from the bank', async () => {
    await useFacilityStore.getState().speak('open');
    expect(useFacilityStore.getState().lastPrompt)
      .toMatchObject({ outcome: 'bank', system: null, turns: null });
  });

  // The call that writes her file is the one hardest to debug by watching her,
  // so it is recorded on every path it can take.
  it('records the extraction call when it lands', async () => {
    useFacilityStore.setState({
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue(OK);

    await useFacilityStore.getState().extractNow();

    const x = useFacilityStore.getState().lastExtract;
    expect(x?.outcome).toBe('applied');
    expect(x?.system).toBe(EXTRACT_SYSTEM);
    expect(x?.user).toContain('hi');
    expect(x?.raw).toBe(OK);
    expect(x?.route).toBe('ANTHROPIC');
    expect(x?.model).toBe('claude-sonnet-5');
  });

  it('records the extraction call when the request never answered', async () => {
    useFacilityStore.setState({
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockRejectedValue(new Error('Network request failed'));

    await useFacilityStore.getState().extractNow();

    const x = useFacilityStore.getState().lastExtract;
    expect(x?.outcome).toBe('failed');
    expect(x?.raw).toBeNull();
    expect(x?.user).toContain('hi');
  });

  it('records the extraction call when the reply cannot be read', async () => {
    useFacilityStore.setState({
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue('the model was unwell today');

    await useFacilityStore.getState().extractNow();

    const x = useFacilityStore.getState().lastExtract;
    expect(x?.outcome).toBe('unparseable');
    expect(x?.raw).toBe('the model was unwell today');
  });

  // A throw after the reply landed is not a reply that never came. Discarding
  // the raw there erases the one distinction this screen exists to preserve.
  it('keeps a reply that arrived when the failure came after it', async () => {
    useFacilityStore.setState({
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue(OK);
    // Thrown from applyExtraction's side of the call, after parseExtraction has
    // already read the reply.
    const capped = jest.spyOn(Date, 'now').mockImplementationOnce(() => {
      throw new Error('the clock went out');
    });

    await useFacilityStore.getState().extractNow();
    capped.mockRestore();

    const x = useFacilityStore.getState().lastExtract;
    expect(x?.outcome).toBe('failed');
    expect(x?.raw).toBe(OK);
  });

  // The reason the two have separate slots: extraction fires seconds after a
  // reply, and one shared field would erase the reply prompt before it could
  // be read.
  it('keeps her reply prompt readable alongside the extraction that followed it', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');
    callLlm.mockResolvedValue(OK);
    await useFacilityStore.getState().extractNow();

    const s = useFacilityStore.getState();
    expect(s.lastPrompt?.outcome).toBe('model');
    expect(s.lastPrompt?.turns?.[0].text).toContain('> hello');
    expect(s.lastExtract?.outcome).toBe('applied');
  });

  // The record has to carry the state the optic took, not the word she used —
  // an unrecognised word becomes `calm` in parseSpeech, and the inspector is
  // the only place that difference is visible.
  it('records the state after the clamp, not the word she asked for', async () => {
    callLlm.mockResolvedValue('{"emotion":"wry","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');

    const s = useFacilityStore.getState();
    expect(s.lastPrompt?.emotion).toBe('calm');
    expect(s.emotion).toBe('calm');
    expect(s.lastPrompt?.raw).toContain('"emotion":"wry"');
  });

  it('records the state she chose when it is one of hers', async () => {
    callLlm.mockResolvedValue('{"emotion":"suspicious","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');

    expect(useFacilityStore.getState().lastPrompt?.emotion).toBe('suspicious');
  });

  // Every other field describes the request. Without the line, the record
  // cannot be read against the screen it produced.
  it('records the line the subject was shown, and the round trip', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');

    const s = useFacilityStore.getState();
    expect(s.lastPrompt?.line).toBe('Noted.');
    expect(s.lastPrompt?.notice).toBeNull();
    expect(s.lastPrompt?.took).toBeGreaterThanOrEqual(0);
    expect(s.lastPrompt?.took).toBeLessThan(5_000);
  });

  // Under a notice the app speaks and her line never reaches the screen. The
  // record has to say that happened, or a silent stage and a refused
  // credential are the same absence.
  it('records that the app spoke instead of her, and what she would have said', async () => {
    callLlm.mockRejectedValue(new QuotaError('http 400: Your credit balance is too low.'));
    await useFacilityStore.getState().speak('subject_spoke', 'hi');

    const s = useFacilityStore.getState();
    expect(s.lastPrompt?.notice).toBe('quota');
    // She had an authored line ready; the app took the turn from her.
    expect(s.lastPrompt?.line).toBeTruthy();
    expect(s.line).toBe('');
  });

  // The guard that matters, and the only one that can catch the regression
  // worth catching: the records are built HERE, out of live state that has the
  // credential sitting next to it. buildRequest puts the key in the headers and
  // never in the prompt — if that ever stops being true, or a field is added
  // that carries the key, the subject's key is printed on a screen they can
  // screenshot. Serialising the whole record is the point: it covers every
  // field a record has, including ones added after this was written.
  it('never writes the credential into either record', async () => {
    const SECRET = 'sk-ant-api03-SECRETSECRETSECRETSECRET';
    useFacilityStore.setState({
      apiKey: SECRET,
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });

    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');
    callLlm.mockResolvedValue(OK);
    await useFacilityStore.getState().extractNow();

    const s = useFacilityStore.getState();
    // both records were actually written — a null record trivially contains no
    // key, and would make this pass while guarding nothing
    expect(s.lastPrompt?.outcome).toBe('model');
    expect(s.lastExtract?.outcome).toBe('applied');

    expect(JSON.stringify(s.lastPrompt)).not.toContain(SECRET);
    expect(JSON.stringify(s.lastExtract)).not.toContain(SECRET);
    // and not a fragment of it either, however it were sliced in
    expect(JSON.stringify(s.lastPrompt)).not.toContain('SECRETSECRET');
    expect(JSON.stringify(s.lastExtract)).not.toContain('SECRETSECRET');
  });
});

describe('extraction', () => {
  const KEY = 'sk-ant-api03-abcdefghijklmnop';

  beforeEach(async () => {
    await storage.clearAll();
    reset();
    callLlm.mockReset();
    useFacilityStore.setState({
      apiKey: KEY, memory: { facts: [], verdicts: [], threads: [], pending: [] },
    });
  });

  // The budget is enforced on the request, not only stated in the prompt: a
  // ceiling the model is told about but not actually given is the worst of the
  // two, since it would record less for no reason.
  it('sends the extraction call under its own token budget', async () => {
    useFacilityStore.setState({
      memory: { ...EMPTY_MEMORY, pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue('{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    await useFacilityStore.getState().extractNow();

    expect(callLlm).toHaveBeenCalledWith(
      expect.any(String), EXTRACT_SYSTEM, expect.any(Array), EXTRACT_MAX_TOKENS,
    );
  });

  it('queues a finished exchange without calling the model', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');
    expect(useFacilityStore.getState().memory.pending).toEqual([{ you: 'hello', her: 'Noted.' }]);
    expect(callLlm).toHaveBeenCalledTimes(1);
  });

  // Nothing was revealed by a line she had already written, and a refusal is
  // not an exchange at all — neither is material for the file (continuity §4.1).
  it('queues nothing for a bank-answered stimulus', async () => {
    await useFacilityStore.getState().speak('open');
    expect(useFacilityStore.getState().memory.pending).toEqual([]);
  });

  it('queues nothing when the credential was refused', async () => {
    callLlm.mockRejectedValue(new AuthError());
    await useFacilityStore.getState().speak('subject_spoke', 'hello');
    expect(useFacilityStore.getState().memory.pending).toEqual([]);
  });

  // The queue is not a view of the transcript: the log rolls at its own cap and
  // must not take unread exchanges with it (continuity §4.1).
  it('queues the exchange even with the transcript already at its cap', async () => {
    useFacilityStore.setState({
      log: Array.from({ length: 200 }, (_, i) => ({
        who: 'vera' as const, text: `old ${i}`, t: i + 1,
      })),
    });
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'still here');

    expect(useFacilityStore.getState().log).toHaveLength(200);
    expect(useFacilityStore.getState().memory.pending).toEqual([{ you: 'still here', her: 'Noted.' }]);
  });

  it('drains the queue and writes memory', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue('{"facts":[{"text":"works in software","keys":["work"],"durable":true}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');

    await useFacilityStore.getState().extractNow();

    const m = useFacilityStore.getState().memory;
    expect(m.facts[0].text).toBe('works in software');
    expect(m.pending).toEqual([]);
  });

  // Extraction takes seconds and she is not deaf while it runs: the subject can
  // finish another exchange before the extractor answers. Draining the whole
  // queue would throw that one away unread, which is the exact loss the queue
  // exists to prevent (continuity §4.1).
  it('drains only the batch it read, keeping whatever queued while it ran', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    const later = { you: 'and again', her: 'Mm.' };
    callLlm.mockImplementation(async () => {
      const m = useFacilityStore.getState().memory;
      useFacilityStore.setState({ memory: { ...m, pending: [...m.pending, later] } });
      return '{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}';
    });

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual([later]);
  });

  // The other end of the same race: the queue can also be shorter than what was
  // read — the 40-cap dropping from the front, or a remount's loadMemory
  // replacing memory mid-flight. Dropping a fixed count then eats an exchange
  // that was never read, so the batch must still be sitting at the head.
  it('leaves the queue alone when it is no longer the queue it read', async () => {
    const batch = [{ you: 'hi', her: 'Barely.' }, { you: 'again', her: 'Mm.' }];
    useFacilityStore.setState({ memory: { ...EMPTY_MEMORY, pending: batch } });
    const survivor = { you: 'third', her: 'Hm.' };
    callLlm.mockImplementation(async () => {
      useFacilityStore.setState({ memory: { ...EMPTY_MEMORY, pending: [survivor] } });
      return '{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}';
    });

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual([survivor]);
  });

  // Bookkeeping is not a reason to reach for a credential she does not have.
  it('does not call the model while she is dormant, and keeps the queue', async () => {
    const pending = [{ you: 'hi', her: 'Barely.' }];
    useFacilityStore.setState({ apiKey: '', memory: { ...EMPTY_MEMORY, pending } });

    await useFacilityStore.getState().extractNow();

    expect(callLlm).not.toHaveBeenCalled();
    expect(useFacilityStore.getState().memory.pending).toEqual(pending);
  });

  it('keeps the queue when extraction fails, for the next trigger', async () => {
    const pending = [{ you: 'hi', her: 'Barely.' }];
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending } });
    callLlm.mockRejectedValue(new Error('Network request failed'));

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual(pending);
  });

  it('keeps the queue when extraction returns junk', async () => {
    const pending = [{ you: 'hi', her: 'Barely.' }];
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending } });
    callLlm.mockResolvedValue('the model was unwell today');

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual(pending);
  });

  it('does nothing at all with an empty queue', async () => {
    await useFacilityStore.getState().extractNow();
    expect(callLlm).not.toHaveBeenCalled();
  });

  // The queue is independent of display and of erasure (continuity §4.1).
  it('survives a transcript erasure', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    await useFacilityStore.getState().clearTranscript();
    expect(useFacilityStore.getState().memory.pending).toHaveLength(1);
  });

  it('survives a kill: the queue is still there on the next launch', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    await useFacilityStore.getState().saveMemory();

    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending: [] } });
    await useFacilityStore.getState().loadMemory();

    expect(useFacilityStore.getState().memory.pending).toEqual([{ you: 'hi', her: 'Barely.' }]);
  });

  it('migrates saved impressions into verdicts on first load, and not twice', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ imps: [{ text: 'Deflects.', at: 'JUL 30' }] }));
    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts).toHaveLength(1);

    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts).toHaveLength(1);
  });

  // The case above cannot fail on its own — the same one impression migrates to
  // the same one verdict however often it runs. This is the one that bites:
  // migration mints v_1.. of its own accord, so a second run over a live store
  // would collide with, and overwrite, everything filed since (continuity §7).
  it('never migrates over a store that already exists', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ imps: [{ text: 'Deflects.', at: 'JUL 30' }] }));
    await useFacilityStore.getState().loadMemory();

    const migrated = useFacilityStore.getState().memory;
    const filed: Verdict = { id: 'v_2', text: 'Evasive.', firstAt: 1, at: 1, count: 1 };
    useFacilityStore.setState({ memory: { ...migrated, verdicts: [...migrated.verdicts, filed] } });
    await useFacilityStore.getState().saveMemory();

    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts.map((v) => v.text))
      .toEqual(['Deflects.', 'Evasive.']);
  });

  // A subject with nothing on file still gets a store written, or every launch
  // would re-enter the migration path forever.
  it('writes the store even when there was nothing to migrate', async () => {
    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts).toEqual([]);
    expect(await storage.get(KEYS.memory)).not.toBeNull();
  });

  // Three situations that used to be one branch. Only the first of them —
  // a store that genuinely is not there — may migrate and write; the other two
  // may have a real file underneath them, and a write would destroy it (§8).
  it('migrates and writes when the store is genuinely absent', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ imps: [{ text: 'Deflects.', at: 'JUL 30' }] }));

    await useFacilityStore.getState().loadMemory();

    expect(useFacilityStore.getState().memory.verdicts.map((v) => v.text)).toEqual(['Deflects.']);
    expect(await storage.get(KEYS.memory)).not.toBeNull();
  });

  it('leaves an unparseable store on disk rather than migrating over it', async () => {
    const bytes = '{"facts":[{"id":"f_1","text":"works in software"';
    await storage.set(KEYS.memory, bytes);

    await useFacilityStore.getState().loadMemory();

    expect(useFacilityStore.getState().memory).toEqual(EMPTY_MEMORY);
    // State alone would not prove it: the truncated file may still be
    // recoverable by hand, and an empty store written over it is permanent.
    expect(await storage.get(KEYS.memory)).toBe(bytes);
  });

  it('leaves the store alone when the read itself fails', async () => {
    const bytes = JSON.stringify({
      facts: [], verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 1 }],
      threads: [], pending: [],
    });
    await storage.set(KEYS.memory, bytes);
    const failing = jest.spyOn(storage, 'get').mockRejectedValue(new Error('database is locked'));

    await useFacilityStore.getState().loadMemory();

    expect(useFacilityStore.getState().memory).toEqual(EMPTY_MEMORY);
    failing.mockRestore();
    // One locked read on one launch must cost her the session, not the file.
    expect(await storage.get(KEYS.memory)).toBe(bytes);
  });
});

// Erasing is the subject's own housekeeping — a clean context and a smaller
// token count — not an act against her. She is told nothing at the time and
// nothing is filed afterwards (2026-08-25, reversing continuity §4.4).
describe('erasure', () => {
  beforeEach(async () => {
    await storage.clearAll();
    reset();
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending: [] } });
  });

  it('records nothing, however many times it happens', async () => {
    await useFacilityStore.getState().clearTranscript();
    await useFacilityStore.getState().clearTranscript();
    await useFacilityStore.getState().clearTranscript();

    const m = useFacilityStore.getState().memory;
    expect(m.verdicts).toEqual([]);
    expect(m.facts).toEqual([]);
    expect(m.threads).toEqual([]);
    expect(callLlm).not.toHaveBeenCalled();
    // The count is the subject's own, for the RECORD screen. She is never
    // given the number, and it is the only trace an erasure leaves.
    expect(useFacilityStore.getState().cleared).toBe(3);
  });

  it('leaves everything she had already concluded exactly where it was', async () => {
    const before = {
      facts: [{ id: 'f_1', text: 'works in software', keys: ['work'], at: 1, durable: true, until: null }],
      verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 2 }],
      threads: [{ id: 't_1', text: 'Asked what he avoids.', at: 1, resolved: false }],
      pending: [{ you: 'hi', her: 'Barely.' }],
    };
    useFacilityStore.setState({ memory: before });

    await useFacilityStore.getState().clearTranscript();

    // Not merely equal in content — nothing was rebuilt, recounted or restamped.
    expect(useFacilityStore.getState().memory).toEqual(before);
    expect(useFacilityStore.getState().log).toEqual([]);
  });
});
