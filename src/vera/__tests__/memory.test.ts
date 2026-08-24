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
