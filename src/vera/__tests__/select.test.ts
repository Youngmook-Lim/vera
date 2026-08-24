import { BUDGET_CHARS, selectMemories, tokens } from '../select';
import { EMPTY_MEMORY, type Memory } from '../memory';

const DAY = 86_400_000;
const NOW = Date.parse('2026-08-23T09:00:00Z');

const fact = (over: Partial<Memory['facts'][0]> = {}) => ({
  id: 'f_1', text: 'works in software', keys: ['work', 'job'],
  at: NOW, durable: true, until: null, ...over,
});
const verdict = (over = {}) => ({ id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 1, ...over });
const thread = (over = {}) => ({ id: 't_1', text: 'Asked what he avoids.', at: NOW, resolved: false, ...over });

describe('tokens', () => {
  it('lowercases, strips punctuation and drops stopwords', () => {
    expect(tokens('Work has been ROUGH, honestly.')).toEqual(['work', 'rough', 'honestly']);
  });
});

describe('threads', () => {
  it('takes unresolved threads under thirty days, oldest-capped at five', () => {
    const threads = Array.from({ length: 8 }, (_, i) => thread({ id: `t_${i}`, at: NOW - i * DAY }));
    const out = selectMemories({ ...EMPTY_MEMORY, threads }, '', NOW);
    expect(out.threads).toHaveLength(5);
  });

  it('leaves out resolved threads and ones older than thirty days', () => {
    const threads = [
      thread({ id: 't_1', resolved: true }),
      thread({ id: 't_2', at: NOW - 31 * DAY }),
      thread({ id: 't_3' }),
    ];
    expect(selectMemories({ ...EMPTY_MEMORY, threads }, '', NOW).threads.map((t) => t.id)).toEqual(['t_3']);
  });
});

describe('facts', () => {
  it('never selects a fact past its expiry, and never removes it from the record', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      facts: [fact({ id: 'f_1', durable: false, until: NOW - DAY }), fact({ id: 'f_2' })],
    };
    expect(selectMemories(memory, '', NOW).facts.map((f) => f.id)).toEqual(['f_2']);
    expect(memory.facts).toHaveLength(2);
  });

  it('ranks a keyword match above a merely recent fact', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      facts: [
        fact({ id: 'f_old', keys: ['work'], at: NOW - 20 * DAY }),
        fact({ id: 'f_new', keys: ['sister'], at: NOW }),
      ],
    };
    expect(selectMemories(memory, 'work has been rough', NOW).facts[0].id).toBe('f_old');
  });
});

describe('verdicts', () => {
  it('ranks a repeatedly reached conclusion above a once-off of the same age', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      verdicts: [verdict({ id: 'v_once', count: 1 }), verdict({ id: 'v_often', count: 6 })],
    };
    expect(selectMemories(memory, '', NOW).verdicts[0].id).toBe('v_often');
  });
});

describe('the budget', () => {
  it('is the only thing limiting facts and verdicts', () => {
    const verdicts = Array.from({ length: 200 }, (_, i) =>
      verdict({ id: `v_${i}`, text: 'x'.repeat(60), at: NOW - i }));
    const out = selectMemories({ ...EMPTY_MEMORY, verdicts }, '', NOW);
    const spent = out.verdicts.reduce((n, v) => n + v.text.length, 0);
    expect(spent).toBeLessThanOrEqual(BUDGET_CHARS);
    expect(out.verdicts.length).toBeGreaterThan(6);
  });

  it('returns everything without padding when the store is small', () => {
    const memory: Memory = { ...EMPTY_MEMORY, facts: [fact()], verdicts: [verdict()] };
    const out = selectMemories(memory, '', NOW);
    expect(out.facts).toHaveLength(1);
    expect(out.verdicts).toHaveLength(1);
  });

  it('does not charge threads against the budget', () => {
    const threads = [thread({ text: 'y'.repeat(400) })];
    const verdicts = Array.from({ length: 100 }, (_, i) =>
      verdict({ id: `v_${i}`, text: 'x'.repeat(60), at: NOW - i }));
    const out = selectMemories({ ...EMPTY_MEMORY, threads, verdicts }, '', NOW);
    const spent = out.verdicts.reduce((n, v) => n + v.text.length, 0);
    expect(out.threads).toHaveLength(1);
    expect(spent).toBeGreaterThan(BUDGET_CHARS - 200);
  });
});
