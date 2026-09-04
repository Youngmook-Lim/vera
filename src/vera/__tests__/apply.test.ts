import { applyExtraction } from '../apply';
import { EMPTY_MEMORY, type Memory } from '../memory';
import type { Extraction } from '../extract';

const NOW = 1_000_000;
const empty: Extraction = { facts: [], verdicts: [], threads: [], resolve: [], retire: [] };

describe('applyExtraction', () => {
  it('adds new entries with minted ids', () => {
    const out = applyExtraction(EMPTY_MEMORY, {
      ...empty,
      facts: [{ text: 'works in software', keys: ['work'], durable: true, until: null }],
      threads: [{ text: 'Asked what he avoids.', askedBy: 'you' as const }],
    }, NOW);
    expect(out.facts[0]).toMatchObject({ id: 'f_1', text: 'works in software', at: NOW });
    expect(out.threads[0]).toMatchObject({ id: 't_1', resolved: false });
  });

  it('mints distinct ids for multiple new facts in one extraction', () => {
    const out = applyExtraction(EMPTY_MEMORY, {
      ...empty,
      facts: [
        { text: 'works in software', keys: [], durable: true, until: null },
        { text: 'has a sister', keys: [], durable: true, until: null },
        { text: 'lives alone', keys: [], durable: true, until: null },
      ],
    }, NOW);
    expect(out.facts.map((f) => f.id)).toEqual(['f_1', 'f_2', 'f_3']);
  });

  it('bumps a reinforced verdict rather than duplicating it', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      verdicts: [{ id: 'v_7', text: 'Deflects.', firstAt: 1, at: 1, count: 2 }],
    };
    const out = applyExtraction(memory, {
      ...empty, verdicts: [{ text: 'Avoids direct answers.', reinforces: 'v_7' }],
    }, NOW);
    expect(out.verdicts).toHaveLength(1);
    expect(out.verdicts[0]).toMatchObject({ id: 'v_7', count: 3, at: NOW, firstAt: 1 });
    // The wording she reached first is the wording that stays on file.
    expect(out.verdicts[0].text).toBe('Deflects.');
  });

  it('ignores an unknown id in reinforces, resolve and retire', () => {
    const out = applyExtraction(EMPTY_MEMORY, {
      ...empty,
      verdicts: [{ text: 'New.', reinforces: 'v_999' }],
      resolve: ['t_999'],
      retire: ['f_999'],
    }, NOW);
    expect(out.verdicts).toHaveLength(1);
    expect(out.verdicts[0].id).toBe('v_1');
  });

  it('resolves a thread without removing it from the record', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      threads: [{ id: 't_2', text: 'Asked.', at: 1, resolved: false, askedBy: 'you' as const }],
    };
    const out = applyExtraction(memory, { ...empty, resolve: ['t_2'] }, NOW);
    expect(out.threads).toHaveLength(1);
    expect(out.threads[0].resolved) .toBe(true);
  });

  // Nothing is ever deleted for being stale (continuity §3).
  it('retires a fact by expiring it, keeping it in the record', () => {
    const memory: Memory = {
      ...EMPTY_MEMORY,
      facts: [{ id: 'f_3', text: 'works in software', keys: [], at: 1, durable: true, until: null }],
    };
    const out = applyExtraction(memory, { ...empty, retire: ['f_3'] }, NOW);
    expect(out.facts).toHaveLength(1);
    expect(out.facts[0]).toMatchObject({ durable: false, until: NOW });
  });

  it('leaves memory untouched for an empty extraction', () => {
    const memory: Memory = { ...EMPTY_MEMORY, verdicts: [{ id: 'v_1', text: 'x', firstAt: 1, at: 1, count: 1 }] };
    expect(applyExtraction(memory, empty, NOW)).toEqual(memory);
  });
});

it('stores which way a thread was asked', () => {
  const next = applyExtraction(EMPTY_MEMORY, {
    facts: [], verdicts: [],
    threads: [{ text: 'what caused the reassignment', askedBy: 'they' as const }],
    resolve: [], retire: [],
  }, Date.now());
  expect(next.threads[0].askedBy).toBe('they');
});
