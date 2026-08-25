import { migrateImpressions } from '../migrate';

const NOW = Date.parse('2026-08-23T09:00:00Z');

describe('migrating impressions to verdicts', () => {
  it('produces one verdict per impression, counted once', () => {
    const out = migrateImpressions(
      [{ text: 'Deflects with questions.', at: 'JUL 30' }, { text: 'Lies about sleep.', at: 'AUG 01' }],
      NOW,
    );
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: 'v_1', text: 'Deflects with questions.', count: 1 });
    expect(out[1].id).toBe('v_2');
  });

  // An impression stored `at` as a display string with no year, so there is no
  // timestamp to recover (continuity §7).
  it('takes the migration instant and keeps the original date string', () => {
    const [v] = migrateImpressions([{ text: 'x', at: 'JUL 30' }], NOW);
    expect(v.at).toBe(NOW);
    expect(v.firstAt).toBe(NOW);
    expect(v.wasAt).toBe('JUL 30');
  });

  it('degrades a malformed impression rather than throwing', () => {
    const out = migrateImpressions(
      [{ text: '', at: 'JUL 30' }, { text: 'kept', at: 'JUL 31' }] as never,
      NOW,
    );
    expect(out.map((v) => v.text)).toEqual(['kept']);
  });

  it('returns nothing for a subject who had no impressions', () => {
    expect(migrateImpressions([], NOW)).toEqual([]);
  });
});
