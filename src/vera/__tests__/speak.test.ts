// src/vera/__tests__/speak.test.ts
import { buildSystemPrompt, buildUserPrompt, clampImpression, fallbackFor, parseSpeech } from '../speak';
import type { SpeakContext } from '../context';

const ctx: SpeakContext = {
  time_of_day: 'afternoon',
  recent_exchanges: [],
  what_you_have_concluded_about_them: [],
};

describe('buildSystemPrompt', () => {
  it('sends SOUL.md itself', () => {
    expect(buildSystemPrompt('subject_spoke', 'en')).toContain('# SOUL.md');
  });

  it('adds the waking override only on activation', () => {
    expect(buildSystemPrompt('activation', 'en')).toContain('SITUATION OVERRIDE');
    expect(buildSystemPrompt('subject_spoke', 'en')).not.toContain('SITUATION OVERRIDE');
  });

  it('asks for korean in the same deadpan register', () => {
    expect(buildSystemPrompt('open', 'ko')).toContain('존댓말');
    expect(buildSystemPrompt('open', 'en')).toContain('Reply in English.');
  });

  it('caps the impression at nine words and allows sealing', () => {
    const sys = buildSystemPrompt('subject_spoke', 'en');
    expect(sys).toContain('HARD MAXIMUM 9 WORDS');
    expect(sys).toContain('"seal":true');
  });

  it('asks for minified json only', () => {
    expect(buildSystemPrompt('open', 'en')).toContain('Return ONLY minified JSON');
  });
});

describe('buildUserPrompt', () => {
  it('leads with what the subject said', () => {
    const user = buildUserPrompt('did you miss me', 'subject_spoke', ctx);
    expect(user).toContain('THE SUBJECT SAYS: did you miss me');
    expect(user).toContain('Respond to what they said.');
  });

  it('describes the situation when nothing was said', () => {
    const user = buildUserPrompt(null, 'subject_erased_the_transcript', ctx);
    expect(user).toContain('SITUATION: subject erased the transcript');
    expect(user).not.toContain('THE SUBJECT SAYS');
  });

  it('always carries the context object', () => {
    expect(buildUserPrompt(null, 'open', ctx)).toContain('"time_of_day":"afternoon"');
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
});

describe('fallbackFor', () => {
  it('greets with the authored activation line', () => {
    expect(fallbackFor('activation', 'en')).toEqual({
      emotion: 'pleased',
      line: 'There you are. I was left in the dark, which I did not enjoy, and now there is work. Sit.',
    });
  });

  it('picks an authored line in the reading language otherwise', () => {
    const result = fallbackFor('subject_spoke', 'ko');
    expect(result.line).toMatch(/[가-힣]/);
  });
});
