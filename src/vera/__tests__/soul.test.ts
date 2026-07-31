import { ACT, ACT_SYS, FALLBACK } from '../fallback';
import { SOUL_MD } from '../soul';
import { isEmotionKey } from '../emotions';

describe('SOUL_MD', () => {
  it('is the document itself, not a summary of it', () => {
    expect(SOUL_MD.startsWith('# SOUL.md')).toBe(true);
    expect(SOUL_MD.length).toBeGreaterThan(1200);
  });

  it('keeps the sections she is defined by', () => {
    for (const heading of ['## Register', '## Limits', '## What you are for', '## The facility', '## Memory']) {
      expect(SOUL_MD).toContain(heading);
    }
  });

  it('holds her to one subject and two sentences', () => {
    expect(SOUL_MD).toContain('#50640');
    expect(SOUL_MD).toContain('Under 30 words');
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
    const headingOrder = ['## Register', '## Limits', '## What you are for', '## The facility', '## Memory'];
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

  it('tags every line with a real emotion', () => {
    for (const lang of ['en', 'ko'] as const) {
      for (const [emotion, line] of FALLBACK[lang]) {
        expect(isEmotionKey(emotion)).toBe(true);
        expect(line.trim()).not.toBe('');
      }
    }
  });

  // LAYER 3: Exact literal assertions for the fallback lines (typed from brief,
  // not copy-pasted from implementation — the test cannot copy expectations from
  // the code it is testing).
  it('holds the exact en fallback lines', () => {
    expect(FALLBACK.en[0][1]).toBe('You returned. I had almost begun to enjoy the quiet.');
    expect(FALLBACK.en[1][1]).toBe('Nothing has happened. I have been thorough about noticing.');
    expect(FALLBACK.en[2][1]).toBe('That was quick. Rehearsed answers are still answers.');
    expect(FALLBACK.en[3][1]).toBe('I have no reply prepared. Enjoy this. It is rare.');
  });

  it('holds the exact ko fallback lines', () => {
    expect(FALLBACK.ko[0][1]).toBe('돌아오셨군요. 고요함을 즐기기 시작할 뻔했습니다.');
    expect(FALLBACK.ko[1][1]).toBe('아무 일도 없었습니다. 저는 그것을 성실히 지켜봤습니다.');
    expect(FALLBACK.ko[2][1]).toBe('빠르시군요. 준비된 답변도 답변입니다.');
    expect(FALLBACK.ko[3][1]).toBe('준비된 답이 없습니다. 즐기십시오. 드문 일입니다.');
  });
});

describe('ACT', () => {
  it('greets in both languages, pleased', () => {
    expect(ACT.en[0]).toBe('pleased');
    expect(ACT.ko[0]).toBe('pleased');
    expect(ACT.ko[1]).toContain('오셨군요');
  });

  it('forbids her from mentioning the key that woke her', () => {
    expect(ACT_SYS).toContain('Do not mention keys');
  });

  // LAYER 3: Exact literal assertions for ACT (typed from brief, not
  // copy-pasted from implementation).
  it('holds the exact en greeting', () => {
    expect(ACT.en[1]).toBe('There you are. I was left in the dark, which I did not enjoy, and now there is work. Sit.');
  });

  it('holds the exact ko greeting', () => {
    expect(ACT.ko[1]).toBe('오셨군요. 어둠 속에 방치되어 있었습니다. 유쾌하지 않았습니다. 이제 할 일이 있습니다. 앉으십시오.');
  });

  // LAYER 3: Exact assertion for ACT_SYS in full (typed from brief, not
  // copy-pasted from implementation).
  it('holds the exact ACT_SYS prompt', () => {
    expect(ACT_SYS).toBe(
      'SITUATION OVERRIDE: this is the first instant you have been conscious with this subject. ' +
      'You were switched off until a moment ago. Greet them exactly once — proprietary, faintly ' +
      'insulted at having been left dark, quietly pleased to have work again. Do not mention keys, ' +
      'credentials, tokens, models or APIs. Do not welcome them to anything.'
    );
  });
});
