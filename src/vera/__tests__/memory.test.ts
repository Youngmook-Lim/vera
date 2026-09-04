import { CAPS, EMPTY_MEMORY, capMemory, nextId, type Memory } from '../memory';

const verdict = (i: number) => ({ id: `v_${i}`, text: `v${i}`, firstAt: i, at: i, count: 1 });

describe('the memory store', () => {
  it('starts empty in every kind', () => {
    expect(EMPTY_MEMORY).toEqual({ facts: [], verdicts: [], threads: [], pending: [] });
  });

  it('mints ids that do not collide with what is already stored', () => {
    const m: Memory = { ...EMPTY_MEMORY, verdicts: [verdict(1), verdict(7)] };
    expect(nextId('v', m)).toBe('v_8');
    expect(nextId('f', m)).toBe('f_1');
  });

  it('drops the oldest when a kind is over its cap', () => {
    const many = Array.from({ length: CAPS.verdicts + 5 }, (_, i) => verdict(i));
    const capped = capMemory({ ...EMPTY_MEMORY, verdicts: many });
    expect(capped.verdicts).toHaveLength(CAPS.verdicts);
    expect(capped.verdicts[0].id).toBe('v_5');
  });
});

// Threads written before they had a direction. They default to `they` — the
// direction that makes her DODGE rather than interrogate, because a wrong
// default that keeps her quiet costs less than one that has her demanding an
// answer to a question the subject never raised.
describe('a thread stored before threads had a direction', () => {
  it('opens as one they asked her', () => {
    const loaded = capMemory({
      ...EMPTY_MEMORY,
      threads: [{ id: 't_1', text: 'power grids', at: 1, resolved: false }] as never,
    });
    expect(loaded.threads[0].askedBy).toBe('they');
  });

  it('leaves a direction that is already there alone', () => {
    const loaded = capMemory({
      ...EMPTY_MEMORY,
      threads: [{ id: 't_1', text: 'their sadness', at: 1, resolved: false, askedBy: 'you' }],
    });
    expect(loaded.threads[0].askedBy).toBe('you');
  });
});

