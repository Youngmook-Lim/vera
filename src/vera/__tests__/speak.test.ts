// src/vera/__tests__/speak.test.ts
import { buildSystemPrompt, buildUserPrompt, fallbackFor, parseSpeech } from '../speak';
import type { SpeakContext } from '../context';
import { isEmotionKey } from '../emotions';

const ctx: SpeakContext = {
  time_of_day: 'afternoon',
};

describe('buildSystemPrompt', () => {
  it('sends SOUL.md, then MEMORY.md', () => {
    const sys = buildSystemPrompt('en', '# MEMORY.md\n\n## What you know about them\n- works in software');
    expect(sys).toContain('# SOUL.md');
    expect(sys).toContain('works in software');
    // Ordering is load-bearing: a provider-side cache keeps a stable prefix
    // only if the static document comes first (continuity §2).
    expect(sys.indexOf('# SOUL.md')).toBeLessThan(sys.indexOf('# MEMORY.md'));
  });

  it('no longer asks her to write impressions', () => {
    const sys = buildSystemPrompt('en', '# MEMORY.md');
    expect(sys).not.toContain('impression');
    expect(sys).not.toContain('HARD MAXIMUM 9 WORDS');
  });

  it('asks only for an emotion and a line', () => {
    expect(buildSystemPrompt('en', '# MEMORY.md')).toContain('{"emotion":"<one of your states>","line":"<your reply>"}');
  });

  it('asks for korean in the same deadpan register', () => {
    expect(buildSystemPrompt('ko', '# MEMORY.md')).toContain('존댓말');
  });

  // Activation is answered from the bank now, so nothing is ever generated
  // under a situation override and the prompt has no branch for one.
  it('never carries a situation override', () => {
    expect(buildSystemPrompt('en', '# MEMORY.md')).not.toContain('SITUATION OVERRIDE');
    expect(buildSystemPrompt('ko', '# MEMORY.md')).not.toContain('SITUATION OVERRIDE');
  });

  it('replies in english when the reading language is english', () => {
    expect(buildSystemPrompt('en', '# MEMORY.md')).toContain('Reply in English.');
  });

  it('asks for minified json only', () => {
    expect(buildSystemPrompt('en', '# MEMORY.md')).toContain('Return ONLY minified JSON');
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
