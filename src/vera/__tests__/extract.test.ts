import { EXTRACT_SYSTEM, buildExtractPrompt, parseExtraction } from '../extract';
import { EMPTY_MEMORY } from '../memory';

describe('the extraction prompt', () => {
  it('is bookkeeping, not her speaking', () => {
    expect(EXTRACT_SYSTEM).not.toContain('# SOUL.md');
    expect(EXTRACT_SYSTEM).toContain('"facts"');
    expect(EXTRACT_SYSTEM).toContain('"reinforces"');
  });

  it('shows the extractor the ids it may act on', () => {
    const prompt = buildExtractPrompt(
      { ...EMPTY_MEMORY, verdicts: [{ id: 'v_7', text: 'Deflects.', firstAt: 1, at: 1, count: 2 }] },
      [{ you: 'hi', her: 'Barely.' }],
    );
    expect(prompt).toContain('v_7');
    expect(prompt).toContain('Deflects.');
    expect(prompt).toContain('hi');
    expect(prompt).toContain('Barely.');
  });
});

describe('parseExtraction', () => {
  it('reads a clean reply', () => {
    const out = parseExtraction('{"facts":[{"text":"works in software","keys":["work"],"durable":true}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts[0]).toMatchObject({ text: 'works in software', keys: ['work'], durable: true });
  });

  it('digs json out of prose', () => {
    expect(parseExtraction('Sure:\n```json\n{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}\n```')).not.toBeNull();
  });

  it('returns null on junk rather than throwing', () => {
    expect(parseExtraction('the model was unwell')).toBeNull();
    expect(parseExtraction('')).toBeNull();
    expect(parseExtraction(null as unknown as string)).toBeNull();
  });

  it('drops an unreadable entry and keeps the rest', () => {
    const out = parseExtraction('{"facts":[{"keys":[]},{"text":"kept","keys":["k"],"durable":true}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts.map((f) => f.text)).toEqual(['kept']);
  });

  // A model reliably emits an ISO date; the store holds epoch milliseconds.
  it('coerces an ISO until into epoch milliseconds', () => {
    const out = parseExtraction('{"facts":[{"text":"deadline","keys":["deadline"],"durable":false,"until":"2026-08-30"}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts[0].until).toBe(Date.parse('2026-08-30'));
  });

  it('makes a fact durable when its expiry cannot be read, rather than losing it', () => {
    const out = parseExtraction('{"facts":[{"text":"x","keys":["x"],"durable":false,"until":"next tuesday"}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts[0]).toMatchObject({ durable: true, until: null });
  });

  it('defaults the maintenance arrays when absent', () => {
    const out = parseExtraction('{"facts":[]}');
    expect(out).toEqual({ facts: [], verdicts: [], threads: [], resolve: [], retire: [] });
  });
});
