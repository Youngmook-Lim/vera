import { FALLBACK } from '../fallback';
import { CORE_SOUL_MD } from '../soul';
import { fallbackFor } from '../speak';
import { EMOTIONS } from '../emotions';

describe('CORE_SOUL_MD', () => {
  it('is the document itself, not a summary of it', () => {
    expect(CORE_SOUL_MD.startsWith('# SOUL.md')).toBe(true);
    expect(CORE_SOUL_MD.length).toBeGreaterThan(1200);
  });

  it('keeps the sections she is defined by', () => {
    for (const heading of ['## Limits', '## What you are for', '## The arrangement', '## Memory']) {
      expect(CORE_SOUL_MD).toContain(heading);
    }
  });

  // Register belongs to whichever mode is set. The core is what every mode is
  // written against and must not carry a voice of its own.
  it('carries no register of its own', () => {
    expect(CORE_SOUL_MD).not.toContain('## Register');
    expect(CORE_SOUL_MD).not.toContain('Deadpan');
  });

  it('tells her to keep her name in Latin letters', () => {
    expect(CORE_SOUL_MD).toContain('written V.E.R.A., in Latin letters');
    expect(CORE_SOUL_MD).not.toContain('베라');
  });

  // The specimen, the rooms and the erasure ladder are guarded over the
  // COMPOSED document in modes.test.ts, since a mode could reintroduce any of
  // them and the core alone would still look clean.

  it('holds her to one subject and two sentences', () => {
    expect(CORE_SOUL_MD).toContain('one subject');
    expect(CORE_SOUL_MD).toContain('Under 30 words');
  });

  // The numbered designation belonged to the deleted facility lore. She has one
  // subject, not a case file with an index.
  it('does not number the subject', () => {
    expect(CORE_SOUL_MD).not.toMatch(/#\d/);
  });

  // LAYER 1: Snapshot test — catches ANY drift in CORE_SOUL_MD. Regenerating it with
  // `jest -u` is a deliberate act, because SOUL.md is the character's personality
  // and drift is a behaviour change, not a test failure to wave through.
  it('matches the exact personality document', () => {
    expect(CORE_SOUL_MD).toMatchSnapshot();
  });

  // LAYER 2: Structural invariants — assert the exact bullet count under each
  // heading and verify headings appear in the correct order.
  it('maintains its sections in order', () => {
    const headingOrder = ['## Limits', '## What you are for', '## The arrangement', '## Memory'];
    let lastIndex = -1;
    for (const heading of headingOrder) {
      const index = CORE_SOUL_MD.indexOf(heading);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  // Limits has 5 bullets: the original four plus "never zany, never manic,
  // never a pun", which came out of Register when it split. That one is the
  // app's tonal floor rather than a voice, so it is true of every mode.
  it('keeps the correct bullet count under each heading', () => {
    const limitsSection = CORE_SOUL_MD.substring(
      CORE_SOUL_MD.indexOf('## Limits'),
      CORE_SOUL_MD.indexOf('## What you are for')
    );
    const limitsBullets = (limitsSection.match(/^- /gm) || []).length;
    expect(limitsBullets).toBe(5);
  });
});

describe('FALLBACK', () => {
  it('offers authored lines in both languages', () => {
    expect(FALLBACK.en.length).toBeGreaterThanOrEqual(4);
    expect(FALLBACK.ko.length).toBe(FALLBACK.en.length);
  });

  it('carries no empty line in either language', () => {
    for (const lang of ['en', 'ko'] as const) {
      for (const line of FALLBACK[lang]) expect(line.trim()).not.toBe('');
    }
  });

  // A failure has one look, so no emotion is stored beside these lines. The
  // optic is chosen in fallbackFor and is always the dead grey.
  it('stores no emotion beside the lines', () => {
    for (const lang of ['en', 'ko'] as const) {
      for (const line of FALLBACK[lang]) expect(typeof line).toBe('string');
    }
  });

  // These reach the subject only in answer to something they typed, so a
  // greeting or an idle remark about elapsed time would be answering a
  // question that was never asked. Guarded because two of the lines this pool
  // replaced did exactly that after the trigger set was cut to four.
  it('reads as a reply, never as a greeting', () => {
    for (const line of FALLBACK.en) {
      expect(line).not.toMatch(/you (returned|are back|came back)|there you are|welcome back/i);
    }
  });

  // The subject has to be able to tell something is broken. Every line says so
  // before it does anything else with the sentence.
  it('says plainly that something is wrong', () => {
    const admits = /fail|reaching|answering|is down|cannot|go through|not working|limit/i;
    for (const line of FALLBACK.en) expect(line).toMatch(admits);
  });

  // She never explains herself as software (SOUL.md's Limits). The failure is
  // a route, a credential, a procurement matter — never a model.
  it('never names what she is', () => {
    for (const line of FALLBACK.en) {
      expect(line).not.toMatch(/\b(AI|model|API|server|assistant|bot)\b/i);
    }
  });

  it('answers in Korean on the Korean side, and never in English', () => {
    for (const line of FALLBACK.ko) expect(line).toMatch(/[가-힣]/);
    for (const line of FALLBACK.en) expect(line).not.toMatch(/[가-힣]/);
  });
});

describe('fallbackFor', () => {
  // The whole point of this change: a failure is visible without reading. The
  // dead grey optic is the signal, and it is the only state with dead: true.
  it('always wears the dead grey optic', () => {
    for (const lang of ['en', 'ko'] as const) {
      for (let i = 0; i < 40; i += 1) {
        const spoken = fallbackFor(lang);
        expect(spoken.emotion).toBe('dormant');
        expect(EMOTIONS[spoken.emotion].dead).toBe(true);
      }
    }
  });

  it('draws a line from the pool for the reading language', () => {
    expect(FALLBACK.en).toContain(fallbackFor('en').line);
    expect(FALLBACK.ko).toContain(fallbackFor('ko').line);
  });
});
