// Pure logic for Results Pending. No React, no I/O — see the design spec
// docs/superpowers/specs/2026-07-20-results-module-design.md.
//
// The queue is fiction: a net-neutral daily jitter around a fixed base (so it
// goes nowhere forever — "EST. WAIT 4,331 YEARS" stays true), plus the
// prototype's live 1.1s ticker while the screen is open. Never reaches zero.

export const QUEUE_BASE = 8442105;
export const QUEUE_FLOOR = 8000000;
export const FIRST_DELTA = -1204;
const JITTER_AMP = 200000; // ±, keeps every day comfortably above the floor

export type QueueEvent = 'none' | 'up';

export interface TickState {
  queue: number;
  delta: number;
  event: QueueEvent;
  tick: number;
}

// Deterministic FNV-1a hash of a string -> unit interval [0, 1).
const hashUnit = (key: string): number => {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
};

// Starting number for a given day: base ± jitter, keyed on (enrolledAt, day) so
// it is stable within a day and independent day-to-day (no trend), floored.
export const queueForDay = (enrolledAt: string | null, dayKey: string): number => {
  const jitter = Math.round((hashUnit(`${enrolledAt ?? 'anon'}|${dayKey}`) * 2 - 1) * JITTER_AMP);
  return Math.max(QUEUE_FLOOR, QUEUE_BASE + jitter);
};

// One 1.1s ticker step (ported from the prototype's startQueue). rand is
// injectable for deterministic tests.
export const nextTick = (s: TickState, rand: () => number = Math.random): TickState => {
  const tick = s.tick + 1;
  if (tick % 9 === 0) {
    const jump = 2000 + Math.floor(rand() * 4000);
    return { queue: s.queue + jump, delta: s.delta + jump, event: 'up', tick };
  }
  const drop = 1 + Math.floor(rand() * 4);
  const event: QueueEvent = tick % 9 === 1 ? 'none' : s.event === 'up' ? 'none' : s.event;
  return { queue: Math.max(QUEUE_FLOOR, s.queue - drop), delta: s.delta - drop, event, tick };
};

export const formatQueue = (n: number): string => n.toLocaleString('en-US');
