// src/vera/__tests__/speak.test.ts
import { buildSystemPrompt, buildUserPrompt, clampImpression, fallbackFor, parseSpeech } from '../speak';
import type { SpeakContext } from '../context';
import { isEmotionKey } from '../emotions';

const ctx: SpeakContext = {
  time_of_day: 'afternoon',
  recent_exchanges: [],
  what_you_have_concluded_about_them: [],
};

describe('buildSystemPrompt', () => {
  it('sends SOUL.md itself', () => {
    expect(buildSystemPrompt('en')).toContain('# SOUL.md');
  });

  // Activation is answered from the bank now, so nothing is ever generated
  // under a situation override and the prompt has no branch for one.
  it('never carries a situation override', () => {
    expect(buildSystemPrompt('en')).not.toContain('SITUATION OVERRIDE');
    expect(buildSystemPrompt('ko')).not.toContain('SITUATION OVERRIDE');
  });

  it('asks for korean in the same deadpan register', () => {
    expect(buildSystemPrompt('ko')).toContain('존댓말');
    expect(buildSystemPrompt('en')).toContain('Reply in English.');
  });

  it('caps the impression at nine words and allows sealing', () => {
    const sys = buildSystemPrompt('en');
    expect(sys).toContain('HARD MAXIMUM 9 WORDS');
    expect(sys).toContain('"seal":true');
  });

  it('asks for minified json only', () => {
    expect(buildSystemPrompt('en')).toContain('Return ONLY minified JSON');
  });
});

describe('buildUserPrompt', () => {
  it('leads with what the subject said', () => {
    const user = buildUserPrompt('did you miss me', ctx);
    expect(user).toContain('THE SUBJECT SAYS: did you miss me');
    expect(user).toContain('Respond to what they said.');
  });

  it('always carries the context object', () => {
    expect(buildUserPrompt('did you miss me', ctx)).toContain('"time_of_day":"afternoon"');
  });
});

describe('clampImpression', () => {
  it('cuts to nine words and ends with a full stop', () => {
    const long = 'one two three four five six seven eight nine ten eleven';
    expect(clampImpression(long)).toBe('one two three four five six seven eight nine.');
  });

  it('does not double the punctuation', () => {
    expect(clampImpression('Answers protocol reminders instantly.')).toBe('Answers protocol reminders instantly.');
    expect(clampImpression('Rehearsed, always;')).toBe('Rehearsed, always.');
  });
});

describe('parseSpeech', () => {
  it('reads a clean minified reply', () => {
    const raw = '{"emotion":"amused","line":"Fourth visit today.","impression":"Counts visits. Denies counting.","seal":false}';
    expect(parseSpeech(raw)).toEqual({
      emotion: 'amused',
      line: 'Fourth visit today.',
      impression: 'Counts visits. Denies counting.',
      seal: false,
    });
  });

  it('digs the json out of a chatty or fenced reply', () => {
    const raw = 'Sure —\n```json\n{"emotion":"calm","line":"Noted."}\n```\nlet me know.';
    expect(parseSpeech(raw)?.line).toBe('Noted.');
  });

  it('falls back to calm when the emotion is not one of hers', () => {
    expect(parseSpeech('{"emotion":"smug","line":"Hm."}')?.emotion).toBe('calm');
  });

  it('clamps a long impression', () => {
    const raw = '{"emotion":"calm","line":"Hm.","impression":"a b c d e f g h i j k"}';
    expect(parseSpeech(raw)?.impression).toBe('a b c d e f g h i.');
  });

  it('reports no impression when the field is absent or empty', () => {
    expect(parseSpeech('{"emotion":"calm","line":"Hm."}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"  "}')?.impression).toBeNull();
  });

  it('seals only on an explicit true', () => {
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"x y","seal":true}')?.seal).toBe(true);
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"x y","seal":"yes"}')?.seal).toBe(false);
  });

  it('returns null rather than throwing on junk', () => {
    expect(parseSpeech('the model was unwell today')).toBeNull();
    expect(parseSpeech('{"emotion":"calm"}')).toBeNull();
    expect(parseSpeech('')).toBeNull();
  });

  it('returns null rather than throwing on a wider spread of hostile input', () => {
    expect(parseSpeech(null as unknown as string)).toBeNull();
    expect(parseSpeech(undefined as unknown as string)).toBeNull();
    expect(parseSpeech('{')).toBeNull();
    expect(parseSpeech('{}')).toBeNull();
    expect(parseSpeech('{"line":123}')).toBeNull();
    expect(parseSpeech('not json at all')).toBeNull();
  });

  it('discards a punctuation-only impression instead of storing a bare period', () => {
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"..."}')).toEqual({
      emotion: 'calm',
      line: 'Hm.',
      impression: null,
      seal: false,
    });
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"!!!"}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":","}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"."}')?.impression).toBeNull();

    // line is preserved even though the impression is discarded
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"..."}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"!!!"}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":","}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"."}')?.line).toBe('Hm.');
  });

  it('discards multi-token punctuation-only impressions, not just a single dot', () => {
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":". . ."}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"!! ??"}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":". !"}')?.impression).toBeNull();
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"   ,   "}')?.impression).toBeNull();

    // line is preserved even though the impression is discarded
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":". . ."}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"!! ??"}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":". !"}')?.line).toBe('Hm.');
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"   ,   "}')?.line).toBe('Hm.');
  });

  it('keeps a Korean impression, since punctuation-detection must not be Latin-only', () => {
    const raw = '{"emotion":"calm","line":"Hm.","impression":"수면에 대해 거짓말합니다"}';
    expect(parseSpeech(raw)?.impression).not.toBeNull();
    expect(parseSpeech(raw)?.impression).toMatch(/[가-힣]/);
  });

  it('keeps a mixed-punctuation impression that carries real words', () => {
    expect(parseSpeech('{"emotion":"calm","line":"Hm.","impression":"Deflects. Always."}')?.impression).toBe(
      'Deflects. Always.',
    );
  });
});

describe('fallbackFor', () => {
  it('picks an authored line in the reading language', () => {
    expect(fallbackFor('ko').line).toMatch(/[가-힣]/);
    expect(fallbackFor('en').line).not.toMatch(/[가-힣]/);
  });

  it('always picks one of hers', () => {
    expect(isEmotionKey(fallbackFor('en').emotion)).toBe(true);
  });
});
