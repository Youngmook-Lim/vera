// src/vera/__tests__/speak.test.ts
import { SPEAKABLE_EMOTIONS, buildSystemPrompt, buildUserPrompt, fallbackFor, parseSpeech } from '../speak';
import { MEMORY_HEADING } from '../memoryDoc';
import type { SpeakContext } from '../context';
import { isEmotionKey } from '../emotions';

const ctx: SpeakContext = {
  time_of_day: 'afternoon',
};

describe('buildSystemPrompt', () => {
  it('sends SOUL.md, then what she knows about the subject', () => {
    const sys = buildSystemPrompt('en', `${MEMORY_HEADING}\n\n## About them\n- works in software`);
    expect(sys).toContain('# SOUL.md');
    expect(sys).toContain('works in software');
    // Ordering is load-bearing: a provider-side cache keeps a stable prefix
    // only if the static document comes first (continuity §2).
    expect(sys.indexOf('# SOUL.md')).toBeLessThan(sys.indexOf(MEMORY_HEADING));
  });

  // SOUL.md is a real fixed document and says so. The memory section is
  // assembled per reply and names no file, so she cannot be asked to produce
  // one — the only `.md` in the whole prompt is SOUL.md's own heading.
  it('names no file but SOUL.md', () => {
    const sys = buildSystemPrompt('en', MEMORY_HEADING);
    expect(sys.match(/\.md/g)).toEqual(['.md', '.md']);
    expect(sys).not.toContain('MEMORY.md');
  });

  it('no longer asks her to write impressions', () => {
    const sys = buildSystemPrompt('en', MEMORY_HEADING);
    expect(sys).not.toContain('impression');
    expect(sys).not.toContain('HARD MAXIMUM 9 WORDS');
  });

  it('asks only for an emotion and a line', () => {
    expect(buildSystemPrompt('en', MEMORY_HEADING)).toContain('{"emotion":"<one of your states>","line":"<your reply>"}');
  });

  // The regression this list closes, and the reason it is worth a test: the
  // prompt asked for "one of your states" and no part of it — not here, not
  // SOUL.md — ever said what they were. She invented a word every reply,
  // parseSpeech recognised none of them, and every one became `calm`.
  it('names every state she is allowed to choose', () => {
    const sys = buildSystemPrompt('en', MEMORY_HEADING);
    expect(SPEAKABLE_EMOTIONS).toHaveLength(8);
    for (const key of SPEAKABLE_EMOTIONS) {
      expect(sys).toContain(key);
      expect(isEmotionKey(key)).toBe(true);
    }
  });

  // `dormant` is the app's state, not hers: the dead grey shown when the model
  // could not be reached at all. Offering it would let her play dead.
  it('does not offer her the dormant state', () => {
    expect(SPEAKABLE_EMOTIONS).not.toContain('dormant');
  });

  // SOUL.md forbids her reciting her own machinery. Naming the states to her
  // is exactly the sort of thing that leaks into a line if it is not said.
  it('tells her the state is for the record and not for the line', () => {
    expect(buildSystemPrompt('en', MEMORY_HEADING)).toContain('never say it');
  });

  it('asks for korean in the same deadpan register', () => {
    expect(buildSystemPrompt('ko', MEMORY_HEADING)).toContain('존댓말');
  });

  // Activation is answered from the bank now, so nothing is ever generated
  // under a situation override and the prompt has no branch for one.
  it('never carries a situation override', () => {
    expect(buildSystemPrompt('en', MEMORY_HEADING)).not.toContain('SITUATION OVERRIDE');
    expect(buildSystemPrompt('ko', MEMORY_HEADING)).not.toContain('SITUATION OVERRIDE');
  });

  it('replies in english when the reading language is english', () => {
    expect(buildSystemPrompt('en', MEMORY_HEADING)).toContain('Reply in English.');
  });

  it('asks for minified json only', () => {
    expect(buildSystemPrompt('en', MEMORY_HEADING)).toContain('Return ONLY minified JSON');
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

describe('parseSpeech', () => {
  it('reads a clean minified reply', () => {
    const raw = '{"emotion":"amused","line":"Fourth visit today."}';
    expect(parseSpeech(raw)).toEqual({
      emotion: 'amused',
      line: 'Fourth visit today.',
    });
  });

  it('digs the json out of a chatty or fenced reply', () => {
    const raw = 'Sure —\n```json\n{"emotion":"calm","line":"Noted."}\n```\nlet me know.';
    expect(parseSpeech(raw)?.line).toBe('Noted.');
  });

  it('falls back to calm when the emotion is not one of hers', () => {
    expect(parseSpeech('{"emotion":"smug","line":"Hm."}')?.emotion).toBe('calm');
  });

  // Sealing is gone, and so is the impression — extraction owns it now
  // (continuity §1). A model that still volunteers either field — an older
  // prompt, a stale cache — must not have it survive into the parsed result.
  it('ignores a seal or impression field entirely', () => {
    const parsed = parseSpeech('{"emotion":"calm","line":"Hm.","impression":"x y","seal":true}');
    expect(parsed).toEqual({ emotion: 'calm', line: 'Hm.' });
    expect(parsed).not.toHaveProperty('seal');
    expect(parsed).not.toHaveProperty('impression');
  });

  it('returns null rather than throwing on junk', () => {
    expect(parseSpeech('the model was unwell today')).toBeNull();
    expect(parseSpeech('{"emotion":"calm"}')).toBeNull();
    expect(parseSpeech('')).toBeNull();
  });

  // One brace in her prose used to cost the subject the whole reply: the greedy
  // span runs from it to the last `}` and throws, and she answers with a
  // fallback line instead of what she actually said. Same recovery as
  // parseExtraction's.
  it('recovers the real object when a stray brace precedes it in prose', () => {
    const raw = 'Filed under { pending }, obviously.\n{"emotion":"amused","line":"Noted."}';
    expect(parseSpeech(raw)).toEqual({ emotion: 'amused', line: 'Noted.' });
  });

  it('returns null rather than throwing on a wider spread of hostile input', () => {
    expect(parseSpeech(null as unknown as string)).toBeNull();
    expect(parseSpeech(undefined as unknown as string)).toBeNull();
    expect(parseSpeech('{')).toBeNull();
    expect(parseSpeech('{}')).toBeNull();
    expect(parseSpeech('{"line":123}')).toBeNull();
    expect(parseSpeech('not json at all')).toBeNull();
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
