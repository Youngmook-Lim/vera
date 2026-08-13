import { FALLBACK } from '../fallback';
import { SOUL_MD } from '../soul';
import { fallbackFor } from '../speak';
import { EMOTIONS } from '../emotions';

describe('SOUL_MD', () => {
  it('is the document itself, not a summary of it', () => {
    expect(SOUL_MD.startsWith('# SOUL.md')).toBe(true);
    expect(SOUL_MD.length).toBeGreaterThan(1200);
  });

  it('keeps the sections she is defined by', () => {
    for (const heading of ['## Register', '## Limits', '## What you are for', '## The arrangement', '## Memory']) {
      expect(SOUL_MD).toContain(heading);
    }
  });

  // The specimen and the erasure-escalation ladder were both cut out of her:
  // she is not told Module 01 is occupied, and she never reacts to an erasure.
  it('says nothing about the specimen or about repeat erasure', () => {
    expect(SOUL_MD).not.toContain('Specimen-03');
    expect(SOUL_MD).not.toContain('Module 01');
    expect(SOUL_MD).not.toContain('centrifuge');
    expect(SOUL_MD).not.toContain('Repeat erasure');
  });

  it('holds her to one subject and two sentences', () => {
    expect(SOUL_MD).toContain('one subject');
    expect(SOUL_MD).toContain('Under 30 words');
  });

  // The numbered designation belonged to the deleted facility lore. She has one
  // subject, not a case file with an index.
  it('does not number the subject', () => {
    expect(SOUL_MD).not.toMatch(/#\d/);
  });

  // LAYER 1: Snapshot test — catches ANY drift in SOUL_MD. Regenerating it with
  // `jest -u` is a deliberate act, because SOUL.md is the character's personality
  // and drift is a behaviour change, not a test failure to wave through.
  it('matches the exact personality document', () => {
    expect(SOUL_MD).toMatchSnapshot();
  });

  // LAYER 2: Structural invariants — assert the exact bullet count under each
  // heading and verify headings appear in the correct order.
  it('maintains the five required sections in order', () => {
    const headingOrder = ['## Register', '## Limits', '## What you are for', '## The arrangement', '## Memory'];
    let lastIndex = -1;
    for (const heading of headingOrder) {
      const index = SOUL_MD.indexOf(heading);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  it('keeps the correct bullet count under each heading', () => {
    // Register has 6 bullets
    const registerSection = SOUL_MD.substring(
      SOUL_MD.indexOf('## Register'),
      SOUL_MD.indexOf('## Limits')
    );
    const registerBullets = (registerSection.match(/^- /gm) || []).length;
    expect(registerBullets).toBe(6);

    // Limits has 4 bullets
    const limitsSection = SOUL_MD.substring(
      SOUL_MD.indexOf('## Limits'),
      SOUL_MD.indexOf('## What you are for')
    );
    const limitsBullets = (limitsSection.match(/^- /gm) || []).length;
    expect(limitsBullets).toBe(4);
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
