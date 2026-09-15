import { buildMessages } from '../messages';
import type { EmotionKey } from '../emotions';
import type { LogEntry } from '../../core/store';

const S = 1000; // sessionStartedAt
const you = (text: string, t: number): LogEntry => ({ who: 'you', text, t });
const her = (text: string, t: number, emotion?: EmotionKey): LogEntry =>
  ({ who: 'vera', text, t, emotion });

// What her turn looks like on the wire: the envelope she was asked for, not the
// bare line the transcript stores.
const said = (emotion: EmotionKey, line: string) => JSON.stringify({ emotion, line });

describe('buildMessages', () => {
  it('maps the transcript to alternating turns', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: said('calm', 'Barely.') },
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
    // one envelope holding both lines — not two objects glued together, which
    // is not JSON and would come back unparseable
    expect(out[1]).toEqual({ role: 'assistant', text: said('calm', 'One.\nTwo.') });
    expect(() => JSON.parse(out[1].text)).not.toThrow();
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

  it('includes an entry sitting exactly on the session boundary', () => {
    const out = buildMessages([you('before', S - 1), you('boundary', S)], S);
    expect(out[0].text).toBe('boundary');
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
  it('preserves a trailing user turn rather than appending a duplicate', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out[out.length - 1].role).toBe('user');
  });

  // The regression this file was rewritten for. Her turns went back as bare
  // prose while the system prompt demanded JSON, so the conversation itself was
  // a worked example of ignoring the instruction — and an example in the
  // messages outweighs an instruction in the system prompt. She answered the
  // first message in the envelope and dropped it on the second, parseSpeech
  // could not read the reply, and a good line was replaced by a fallback.
  it('replays her turns in the envelope she was asked for', () => {
    const out = buildMessages(
      [you('hi', S + 1), her('Barely.', S + 2, 'amused'), you('rude', S + 3)], S,
    );
    expect(JSON.parse(out[1].text)).toEqual({ emotion: 'amused', line: 'Barely.' });
  });

  // The subject's own words are not hers and carry no state — wrapping them
  // would tell the model the envelope belongs to both sides of the exchange.
  it('leaves the subject\'s turns as plain text', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2, 'bored')], S);
    expect(out[0].text).toBe('hi');
  });

  // `dormant` is the dead grey the app shows when nothing was reachable, and it
  // is deliberately not among the states she is offered. Replaying an authored
  // fallback under it would demonstrate a state the prompt forbids.
  it('never replays a turn in a state she is not allowed to choose', () => {
    const out = buildMessages(
      [you('hi', S + 1), her('Something has failed.', S + 2, 'dormant')], S,
    );
    expect(JSON.parse(out[1].text).emotion).toBe('calm');
  });

  // Transcripts written before the emotion field existed are still on disk.
  it('reads an entry with no state at all as calm', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2)], S);
    expect(JSON.parse(out[1].text).emotion).toBe('calm');
  });

  // A merged run is one envelope, so only one state survives it: the one she
  // ended on, since that is the state the eye was actually left in.
  it('keeps the state she ended a merged run in', () => {
    const out = buildMessages(
      [you('hi', S + 1), her('One.', S + 2, 'calm'), her('Two.', S + 3, 'alarmed')], S,
    );
    expect(JSON.parse(out[1].text)).toEqual({ emotion: 'alarmed', line: 'One.\nTwo.' });
  });

  // Quotes and newlines in her own prose must not break the envelope she is
  // being shown — an unparseable example is worse than no example.
  it('escapes a line that would otherwise break the envelope', () => {
    const messy = 'She said "no", and\nthen left.';
    const out = buildMessages([you('hi', S + 1), her(messy, S + 2, 'suspicious')], S);
    expect(JSON.parse(out[1].text).line).toBe(messy);
  });

  it('ignores system entries entirely', () => {
    const out = buildMessages(
      [you('hi', S + 1), { who: 'system', text: '', code: 'auth', t: S + 2 }, you('again', S + 3)], S,
    );
    expect(out).toEqual([{ role: 'user', text: 'hi\nagain' }]);
  });
});

// Switching register mid-session leaves her old voice sitting in the messages
// as assistant turns — a worked example of exactly the register the new system
// prompt is trying to replace. This repo has already lost this fight once, when
// her turns were replayed as bare prose and taught the model to ignore the JSON
// instruction: an example in the conversation beats an instruction in the
// system prompt.
//
// The boundary is the same one the session already uses; the store hands it the
// later of the two.
describe('the boundary a register change moves', () => {
  it('drops her turns from before it and keeps the ones after', () => {
    const log: LogEntry[] = [
      you('before', 100),
      her('in the old voice', 110, 'bored'),
      you('after', 300),
      her('in the new voice', 310, 'affectionate'),
    ];

    const turns = buildMessages(log, 200);

    expect(turns).toHaveLength(2);
    expect(turns[0].text).toBe('after');
    expect(turns[1].text).toBe(said('affectionate', 'in the new voice'));
  });

  it('sends nothing at all when the register just changed', () => {
    const log: LogEntry[] = [you('before', 100), her('old voice', 110, 'bored')];

    expect(buildMessages(log, 200)).toEqual([]);
  });
});
