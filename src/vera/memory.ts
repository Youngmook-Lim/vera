// The three kinds she keeps (continuity §3). Facts are things true about the
// subject's life, verdicts are her conclusions about their character, threads
// are questions she asked that went unanswered.
export interface Fact {
  id: string;
  text: string;
  keys: string[];
  at: number;
  durable: boolean;
  until: number | null;
}

export interface Verdict {
  id: string;
  text: string;
  firstAt: number;
  at: number;
  count: number;
  // Only set by migration: the display date of the impression this came from,
  // whose real timestamp was never stored (continuity §7).
  wasAt?: string;
}

export interface Thread {
  id: string;
  text: string;
  at: number;
  resolved: boolean;
}

export interface Exchange {
  you: string | null;
  her: string;
}

export interface Memory {
  facts: Fact[];
  verdicts: Verdict[];
  threads: Thread[];
  // Finished exchanges awaiting extraction. Deliberately not a flag on the
  // transcript: the log is capped and erasable, and either would destroy
  // exchanges that were never read (continuity §4.1).
  pending: Exchange[];
}

export const EMPTY_MEMORY: Memory = { facts: [], verdicts: [], threads: [], pending: [] };

// Disk is not the constraint — the extractor is sent the whole memory so it can
// supersede and merge, which makes storage size into prompt size (continuity §3).
export const CAPS = { facts: 400, verdicts: 200, threads: 50, pending: 40 } as const;

const numberOf = (id: string): number => Number(id.split('_')[1] ?? 0) || 0;

// Monotonic per prefix, derived from what is stored rather than a counter, so a
// reload cannot mint an id that already exists.
export const nextId = (prefix: 'f' | 'v' | 't', memory: Memory): string => {
  const pool = prefix === 'f' ? memory.facts : prefix === 'v' ? memory.verdicts : memory.threads;
  const highest = pool.reduce((max, e) => Math.max(max, numberOf(e.id)), 0);
  return `${prefix}_${highest + 1}`;
};

export const capMemory = (memory: Memory): Memory => ({
  facts: memory.facts.slice(-CAPS.facts),
  verdicts: memory.verdicts.slice(-CAPS.verdicts),
  threads: memory.threads.slice(-CAPS.threads),
  pending: memory.pending.slice(-CAPS.pending),
});
