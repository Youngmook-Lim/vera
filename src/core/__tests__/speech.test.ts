import { AuthError } from '../../vera/llm';
import { runSpeech } from '../speech';

const deps = (over = {}) => ({
  key: 'sk-ant-api03-abcdefghijklmnop',
  said: 'did you miss me',
  lang: 'en' as const,
  context: { time_of_day: 'afternoon', recent_exchanges: [], what_you_have_concluded_about_them: [] },
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
    const [system, user] = d.call.mock.calls[0];
    expect(system).toContain('# SOUL.md');
    expect(user).toContain('THE SUBJECT SAYS: did you miss me');
  });

  it('carries an impression through', async () => {
    const d = deps({ call: jest.fn().mockResolvedValue('{"emotion":"calm","line":"Hm.","impression":"Deflects with questions"}') });
    const result = await runSpeech(d);
    expect(result.impression).toBe('Deflects with questions.');
  });

  it('falls back to an authored line when the network is dark', async () => {
    const d = deps({ call: jest.fn().mockRejectedValue(new Error('Network request failed')) });
    const result = await runSpeech(d);
    expect(result.line).toBeTruthy();
    expect(result.authFailed).toBe(false);
    expect(result.impression).toBeNull();
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
