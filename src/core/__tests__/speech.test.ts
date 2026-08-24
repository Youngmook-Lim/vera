import { AuthError } from '../../vera/llm';
import { runSpeech } from '../speech';
import { buildMessages, type Turn } from '../../vera/messages';

const deps = (over = {}) => ({
  key: 'sk-ant-api03-abcdefghijklmnop',
  said: 'did you miss me',
  turns: [{ role: 'user' as const, text: 'did you miss me' }],
  lang: 'en' as const,
  context: { time_of_day: 'afternoon' },
  memoryMd: '# MEMORY.md\n\n## What you know about them\n- works in software',
  call: jest.fn().mockResolvedValue('{"emotion":"amused","line":"Barely."}'),
  ...over,
});

describe('runSpeech', () => {
  it('returns her line and emotion', async () => {
    const result = await runSpeech(deps());
    expect(result).toMatchObject({ emotion: 'amused', line: 'Barely.', authFailed: false });
  });

  it('passes SOUL.md and the context to the model', async () => {
    const d = deps();
    await runSpeech(d);
    const [system, turns] = d.call.mock.calls[0];
    expect(system).toContain('# SOUL.md');
    expect(turns[turns.length - 1].text).toContain('THE SUBJECT SAYS: did you miss me');
  });

  it('sends MEMORY.md in the system prompt, after SOUL.md', async () => {
    const d = deps();
    await runSpeech(d);
    const [system] = d.call.mock.calls[0];
    expect(system).toContain('works in software');
    expect(system.indexOf('# SOUL.md')).toBeLessThan(system.indexOf('# MEMORY.md'));
  });

  // The session travels as real turns now, so the whole of it must reach the
  // model — not a summary of it (continuity §2).
  it('sends the session as turns, with the composed prompt in place of the last one', async () => {
    const turns: Turn[] = [
      { role: 'user', text: 'are you there' },
      { role: 'assistant', text: 'Regrettably.' },
      { role: 'user', text: 'did you miss me' },
    ];
    const d = deps({ turns });
    await runSpeech(d);

    const sent: Turn[] = d.call.mock.calls[0][1];
    expect(sent.map((t) => t.role)).toEqual(['user', 'assistant', 'user']);
    expect(sent[0].text).toBe('are you there');
    // The contract this pins: `slice(0, -1)` drops exactly the trailing user
    // turn buildMessages produced, never a real assistant turn. Asserted on
    // content, because a length check alone would pass if the wrong one went.
    expect(sent[1].text).toBe('Regrettably.');
    expect(sent[2].text).toContain('THE SUBJECT SAYS: did you miss me');
    expect(sent[2].text).toContain('"time_of_day":"afternoon"');
  });

  // `speak('subject_spoke')` with an empty `said` pushes nothing into the log,
  // so buildMessages hands back turns ending in HER line. Replacing the last
  // turn unconditionally would swallow something she actually said.
  it('appends rather than replaces when the last turn is one of hers', async () => {
    const turns: Turn[] = [
      { role: 'user', text: 'are you there' },
      { role: 'assistant', text: 'Regrettably.' },
    ];
    const d = deps({ said: '', turns });
    await runSpeech(d);

    const sent: Turn[] = d.call.mock.calls[0][1];
    expect(sent.map((t) => t.role)).toEqual(['user', 'assistant', 'user']);
    expect(sent[0].text).toBe('are you there');
    // The line she said survives — under the old unconditional slice this
    // entry was 'are you there' and her reply was gone entirely.
    expect(sent[1].text).toBe('Regrettably.');
    expect(sent[2].text).toContain('THE SUBJECT SAYS:');
  });

  // The seam between the merge and the replace. A refused credential logs a
  // system entry between two of their messages; buildMessages merges the two
  // into one turn to keep the array alternating, and the last turn is then a
  // merge rather than just `said`. Dropping the whole of it deletes the line
  // that caused the refusal from the conversation she sees.
  it('keeps their earlier line when a system entry merged it into the last turn', async () => {
    const turns = buildMessages([
      { who: 'you', text: 'hi', t: 2 },
      { who: 'system', text: '', t: 3, code: 'auth' },
      { who: 'you', text: 'again', t: 4 },
    ], 1);
    expect(turns).toEqual([{ role: 'user', text: 'hi\nagain' }]);

    const d = deps({ said: 'again', turns });
    await runSpeech(d);

    const sent: Turn[] = d.call.mock.calls[0][1];
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain('hi');
    expect(sent[0].text).toContain('THE SUBJECT SAYS: again');
  });

  // An empty array is an invalid request on all three provider shapes and
  // nothing downstream guards it. It cannot happen here: with no input turns,
  // there is no trailing user turn to replace and the composed prompt is
  // still appended.
  it('never sends an empty conversation, even with no turns at all', async () => {
    const d = deps({ turns: [] });
    await runSpeech(d);

    const sent: Turn[] = d.call.mock.calls[0][1];
    expect(sent).toHaveLength(1);
    expect(sent[0].role).toBe('user');
    expect(sent[0].text).toContain('THE SUBJECT SAYS: did you miss me');
  });

  it('falls back to an authored line when the network is dark', async () => {
    const d = deps({ call: jest.fn().mockRejectedValue(new Error('Network request failed')) });
    const result = await runSpeech(d);
    expect(result.line).toBeTruthy();
    expect(result.authFailed).toBe(false);
  });

  it('falls back when the model returns something unparseable', async () => {
    const d = deps({ call: jest.fn().mockResolvedValue('I am afraid I cannot do that') });
    const result = await runSpeech(d);
    expect(result.line).toBeTruthy();
  });

  // A refusal is the key's fault, and the caller sends her dormant for it.
  it('reports an auth failure distinctly', async () => {
    const d = deps({ call: jest.fn().mockRejectedValue(new AuthError()) });
    const result = await runSpeech(d);
    expect(result.authFailed).toBe(true);
  });
});
