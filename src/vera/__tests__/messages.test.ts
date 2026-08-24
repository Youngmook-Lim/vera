import { buildMessages } from '../messages';
import type { LogEntry } from '../../core/store';

const S = 1000; // sessionStartedAt
const you = (text: string, t: number): LogEntry => ({ who: 'you', text, t });
const her = (text: string, t: number): LogEntry => ({ who: 'vera', text, t });

describe('buildMessages', () => {
  it('maps the transcript to alternating turns', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'Barely.' },
      { role: 'user', text: 'rude' },
    ]);
  });

  // Three of four stimuli produce an assistant line with no user line before
  // it, so the log routinely holds consecutive `vera` entries. Anthropic
  // rejects a non-alternating array outright (continuity §2).
  it('merges consecutive same-role runs into one turn', () => {
    const out = buildMessages(
      [you('hi', S + 1), her('One.', S + 2), her('Two.', S + 3), you('ok', S + 4)], S,
    );
    expect(out[1]).toEqual({ role: 'assistant', text: 'One.\nTwo.' });
    expect(out).toHaveLength(3);
  });

  it('drops leading assistant turns, since the array must open on user', () => {
    const out = buildMessages([her('Oh. It is you.', S + 1), you('hi', S + 2)], S);
    expect(out).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('returns nothing for a log of greetings alone', () => {
    expect(buildMessages([her('Oh.', S + 1), her('Again.', S + 2)], S)).toEqual([]);
  });

  it('holds the whole session and nothing older', () => {
    const out = buildMessages([you('before', S - 5), her('old', S - 4), you('now', S + 1)], S);
    expect(out).toEqual([{ role: 'user', text: 'now' }]);
  });

  it('is not truncated by a session longer than the old sixty-entry cap', () => {
    const long: LogEntry[] = [];
    for (let i = 0; i < 100; i += 1) {
      long.push(you(`u${i}`, S + i * 2), her(`v${i}`, S + i * 2 + 1));
    }
    const out = buildMessages(long, S);
    expect(out).toHaveLength(200);
    expect(out[0].text).toBe('u0');
  });

  // speak() pushes the subject's words into the log before the request is
  // built, so the current input is already last. Appending it would duplicate.
  it('ends on user without anything being appended', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out[out.length - 1].role).toBe('user');
  });

  it('ignores system entries entirely', () => {
    const out = buildMessages(
      [you('hi', S + 1), { who: 'system', text: '', code: 'auth', t: S + 2 }, you('again', S + 3)], S,
    );
    expect(out).toEqual([{ role: 'user', text: 'hi\nagain' }]);
  });
});
