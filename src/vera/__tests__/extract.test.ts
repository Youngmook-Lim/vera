import { EXTRACT_MAX_TOKENS, EXTRACT_SYSTEM, buildExtractPrompt, parseExtraction } from '../extract';
import { EMPTY_MEMORY } from '../memory';

describe('the extraction prompt', () => {
  it('is bookkeeping, not her speaking', () => {
    expect(EXTRACT_SYSTEM).not.toContain('# SOUL.md');
    expect(EXTRACT_SYSTEM).toContain('"facts"');
    expect(EXTRACT_SYSTEM).toContain('"reinforces"');
  });

  // The two calls shared the reply's 300-token default, and this one rewrites a
  // file covering the whole pending queue rather than saying one line under
  // thirty words. Too small, it returns nothing and the queue grows, which
  // makes the next attempt larger against the same ceiling.
  it('has its own budget, well above a reply\'s', () => {
    expect(EXTRACT_MAX_TOKENS).toBeGreaterThan(300);
  });

  // Stated in the prompt, from the same constant that is sent to the provider —
  // a number told to the model that does not match the one enforced on the
  // request is worse than not telling it at all.
  it('tells the model the ceiling it is actually given', () => {
    expect(EXTRACT_SYSTEM).toContain(`${EXTRACT_MAX_TOKENS} tokens`);
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
    expect(out?.facts[0]).toMatchObject({ durable: false, until: Date.parse('2026-08-30') });
  });

  it('accepts a numeric until as an epoch directly, without flipping durable', () => {
    const epoch = Date.parse('2026-08-30');
    const out = parseExtraction(`{"facts":[{"text":"deadline","keys":["deadline"],"durable":false,"until":${epoch}}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}`);
    expect(out?.facts[0]).toMatchObject({ durable: false, until: epoch });
  });

  it('makes a fact durable when its expiry cannot be read, rather than losing it', () => {
    const out = parseExtraction('{"facts":[{"text":"x","keys":["x"],"durable":false,"until":"next tuesday"}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts[0]).toMatchObject({ durable: true, until: null });
  });

  it('defaults the maintenance arrays when absent', () => {
    const out = parseExtraction('{"facts":[]}');
    expect(out).toEqual({ facts: [], verdicts: [], threads: [], resolve: [], retire: [] });
  });

  it('recovers the real object when a stray brace precedes it in prose', () => {
    const raw = 'Note: { see prior } then:\n{"facts":[],"verdicts":[],"threads":[],"resolve":[],"retire":[]}';
    expect(parseExtraction(raw)).toEqual({ facts: [], verdicts: [], threads: [], resolve: [], retire: [] });
  });
});
