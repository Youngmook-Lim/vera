import {
  QUEUE_BASE,
  QUEUE_FLOOR,
  FIRST_DELTA,
  queueForDay,
  nextTick,
  formatQueue,
  type TickState,
} from './queue';

describe('queueForDay', () => {
  it('is deterministic for the same inputs', () => {
    expect(queueForDay('2026-07-01', '2026-07-20')).toBe(queueForDay('2026-07-01', '2026-07-20'));
  });

  it('jitters around the base (net-neutral), staying within ±250k of base', () => {
    const v = queueForDay('2026-07-01', '2026-07-20');
    expect(Math.abs(v - QUEUE_BASE)).toBeLessThanOrEqual(250000);
  });

  it('never drops below the floor across a year of days', () => {
    for (let d = 1; d <= 365; d++) {
      const key = `2026-${String(((d - 1) % 12) + 1).padStart(2, '0')}-${String((d % 28) + 1).padStart(2, '0')}`;
      expect(queueForDay('2026-01-01', key)).toBeGreaterThanOrEqual(QUEUE_FLOOR);
    }
  });

  it('produces both improved and worsened day-to-day deltas over a range of days', () => {
    const deltas: number[] = [];
    for (let d = 1; d < 40; d++) {
      const a = queueForDay('2026-01-01', `2026-01-${String(d).padStart(2, '0')}`);
      const b = queueForDay('2026-01-01', `2026-01-${String(d + 1).padStart(2, '0')}`);
      deltas.push(b - a);
    }
    expect(deltas.some((x) => x > 0)).toBe(true);
    expect(deltas.some((x) => x < 0)).toBe(true);
  });

  it('handles a null enrolledAt without throwing', () => {
    expect(() => queueForDay(null, '2026-07-20')).not.toThrow();
  });
});

describe('nextTick', () => {
  const base: TickState = { queue: QUEUE_BASE, delta: FIRST_DELTA, event: 'none', tick: 0 };

  it('drops by 1..4 on a normal tick and keeps event none', () => {
    const s = nextTick(base, () => 0); // rand=0 -> drop of 1
    expect(base.queue - s.queue).toBe(1);
    expect(s.delta).toBe(FIRST_DELTA - 1);
    expect(s.event).toBe('none');
    expect(s.tick).toBe(1);
  });

  it('jumps up by 2000..5999 on every 9th tick and sets event=up', () => {
    let s: TickState = { ...base, tick: 8 };
    s = nextTick(s, () => 0); // tick 9 -> jump of exactly 2000
    expect(s.queue - QUEUE_BASE).toBe(2000);
    expect(s.delta).toBe(FIRST_DELTA + 2000);
    expect(s.event).toBe('up');
    expect(s.tick).toBe(9);
  });

  it('resets event to none on the tick after a jump', () => {
    const afterJump: TickState = { queue: QUEUE_BASE, delta: FIRST_DELTA, event: 'up', tick: 9 };
    const s = nextTick(afterJump, () => 0); // tick 10 -> tick%9===1
    expect(s.event).toBe('none');
  });

  it('never lets the queue fall below the floor', () => {
    const low: TickState = { queue: QUEUE_FLOOR, delta: 0, event: 'none', tick: 1 };
    const s = nextTick(low, () => 0.999); // biggest drop
    expect(s.queue).toBe(QUEUE_FLOOR);
  });
});

describe('formatQueue', () => {
  it('groups thousands', () => {
    expect(formatQueue(8442105)).toBe('8,442,105');
  });
});
