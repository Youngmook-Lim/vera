import type { Fact, Memory, Thread, Verdict } from './memory';

export const BUDGET_CHARS = 3000;
export const THREAD_MAX_AGE_MS = 30 * 86_400_000;
export const THREAD_MAX = 5;
const HALF_LIFE_MS = 30 * 86_400_000;

export interface Selection {
  facts: Fact[];
  verdicts: Verdict[];
  threads: Thread[];
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from',
  'has', 'have', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'so',
  'that', 'the', 'this', 'to', 'was', 'were', 'with', 'you', 'your',
]);

// Word matching, not meaning: "the thing I do all day" will not find `work`.
// The mitigation is that extraction tags each fact with search terms while it
// still has the text (continuity §5).
export const tokens = (said: string): string[] =>
  String(said ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));

export const recency = (at: number, now: number): number =>
  Math.pow(2, -Math.max(0, now - at) / HALF_LIFE_MS);

const scoreFact = (f: Fact, said: string[], now: number): number => {
  const overlap = f.keys.filter((k) => said.includes(k.toLowerCase())).length;
  return 3 * overlap + recency(f.at, now) + (f.durable ? 1 : 0);
};

const scoreVerdict = (v: Verdict, now: number): number =>
  recency(v.at, now) + 2 * Math.log(1 + v.count);

// Threads are taken first and uncharged: few, short, and always relevant.
// Facts and verdicts are then pooled and taken highest-first until the
// character budget is spent — one governor, and it is the one that maps to
// what the subject pays (continuity §5).
export const selectMemories = (memory: Memory, said: string, now: number): Selection => {
  const words = tokens(said);

  const threads = memory.threads
    .filter((t) => !t.resolved && now - t.at < THREAD_MAX_AGE_MS)
    .sort((a, b) => a.at - b.at)
    .slice(0, THREAD_MAX);

  const scored = [
    ...memory.facts
      .filter((f) => f.durable || f.until === null || f.until > now)
      .map((f) => ({ kind: 'fact' as const, entry: f, score: scoreFact(f, words, now) })),
    ...memory.verdicts.map((v) => ({ kind: 'verdict' as const, entry: v, score: scoreVerdict(v, now) })),
  ].sort((a, b) => b.score - a.score);

  const facts: Fact[] = [];
  const verdicts: Verdict[] = [];
  let spent = 0;
  for (const item of scored) {
    const cost = item.entry.text.length;
    if (spent + cost > BUDGET_CHARS) continue;
    spent += cost;
    if (item.kind === 'fact') facts.push(item.entry);
    else verdicts.push(item.entry);
  }

  return { facts, verdicts, threads };
};
