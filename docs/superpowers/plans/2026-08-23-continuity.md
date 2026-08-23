# Continuity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make V.E.R.A. feel like the same person across days, by giving her the whole session as a real conversation and a three-kind memory written by its own call.

**Architecture:** Her reply request becomes `SOUL.md + MEMORY.md` as the system prompt and real alternating turns as messages. A new memory store holds facts, verdicts and open threads; a pure selector picks what fits a character budget; a second LLM call, batched and fired on three triggers, reads finished exchanges and writes memory. Every decision module stays pure, React-free and unit-tested.

**Tech Stack:** TypeScript, React Native 0.86.2, Expo SDK 57, Zustand, AsyncStorage, Jest 29 + jest-expo, React Testing Library v14.

**Spec:** `docs/superpowers/specs/2026-08-20-continuity-design.md`. Cite sections in code comments as `(continuity §N)`.

## Global Constraints

- **Repo style is single quotes.** An editor formatter here has previously reformatted files to double quotes — do not let it.
- **Verify with `npm test` and `npx tsc --noEmit`.** Both must pass before every commit.
- **No test may make a real network request.** Mock `src/vera/llm.ts` with a `jest.requireActual` spread so `AuthError` stays a real class for `speech.ts`'s `instanceof`.
- **Mock `expo-secure-store`** with an in-memory vault — the OS keystore has no jsdom implementation.
- **RTL v14 is fully async:** `await render(...)`, `await fireEvent.press(...)`, and `await view.unmount()`. Omitting the last causes overlapping `act()` and `toJSON()` returning null.
- **Skia and reanimated are jest no-ops.** Never put logic inside a Skia component; the suite cannot see it.
- **All UI copy comes from `T` in `src/shell/strings.ts`**, both languages, keys identical. All hex from `palette` in `src/core/theme.ts`.
- **MEMORY.md and SOUL.md are document content and are never translated.** Only screen furniture reads from `T[lang]`.
- **`src/core/` must never import from `src/shell/`.** Core keeps codes; the shell resolves wording.
- **Storage caps:** 400 facts, 200 verdicts, 50 threads, 40 pending exchanges, 200 log entries.
- **Selection:** threads first (max 5, unresolved, under 30 days, uncharged); then facts and verdicts pooled by score to a **3000-character** budget. Recency half-life **30 days**.
- **Extraction batch size 6.** Triggers: app background, 6 pending, non-empty queue on launch.

---

### Task 1: The memory store

**Files:**
- Create: `src/vera/memory.ts`
- Create: `src/vera/__tests__/memory.test.ts`
- Modify: `src/core/storage.ts` (add `memory` key)

**Interfaces:**
- Produces: `Fact`, `Verdict`, `Thread`, `Memory`, `EMPTY_MEMORY`, `CAPS`, `nextId(prefix, memory)`, `capMemory(memory)`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/memory.test.ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- memory.test`
Expected: FAIL — `Cannot find module '../memory'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/memory.ts

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
```

- [ ] **Step 4: Add the storage key**

In `src/core/storage.ts`, change the `KEYS` object and its comment:

```ts
// Five ordinary stores. Modules 01 and 02 each own their own — neither has
// anything to do with her soul or the transcript, and she is not told what is
// in either of them. Her memory is its own store: it outgrew the soul blob
// when it stopped being a flat list of impressions (continuity §3).
export const KEYS = {
  soul: 'facility.v2.soul',
  transcript: 'facility.v2.transcript',
  memory: 'facility.v2.memory',
  organism: 'facility.mod01.organism',
  identity: 'facility.mod02.identity',
} as const;
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test -- memory.test && npx tsc --noEmit`
Expected: PASS, no type errors

- [ ] **Step 6: Commit**

```bash
git add src/vera/memory.ts src/vera/__tests__/memory.test.ts src/core/storage.ts
git commit -m "feat: the three kinds she keeps, and the store that holds them"
```

---

### Task 2: Migration from impressions

**Files:**
- Create: `src/vera/migrate.ts`
- Create: `src/vera/__tests__/migrate.test.ts`

**Interfaces:**
- Consumes: `Memory`, `EMPTY_MEMORY`, `Verdict` from `src/vera/memory`
- Produces: `migrateImpressions(imps, now)` → `Verdict[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/migrate.test.ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- migrate.test`
Expected: FAIL — `Cannot find module '../migrate'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/migrate.ts
import type { Verdict } from './memory';

export interface StoredImpression {
  text: string;
  at: string;
}

// The v2 impressions become verdicts (continuity §7). Their dates cannot be
// recovered: `at` was a display string produced by mmmdd() for the MEMORY.md
// screen, with no year and no timestamp behind it. Every migrated verdict
// therefore starts equally recent, and the original string is kept so the
// screen can still show when she filed it. `count` still ranks them, and one
// round of reinforcement fixes recency.
export const migrateImpressions = (imps: StoredImpression[], now: number): Verdict[] =>
  (Array.isArray(imps) ? imps : [])
    .filter((imp) => typeof imp?.text === 'string' && imp.text.trim().length > 0)
    .map((imp, i) => ({
      id: `v_${i + 1}`,
      text: imp.text.trim(),
      firstAt: now,
      at: now,
      count: 1,
      wasAt: typeof imp.at === 'string' ? imp.at : undefined,
    }));
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- migrate.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/migrate.ts src/vera/__tests__/migrate.test.ts
git commit -m "feat: her impressions become verdicts, dates and all"
```

---

### Task 3: Selecting what she is given

**Files:**
- Create: `src/vera/select.ts`
- Create: `src/vera/__tests__/select.test.ts`

**Interfaces:**
- Consumes: `Memory`, `Fact`, `Verdict`, `Thread` from `src/vera/memory`
- Produces: `tokens(said)`, `recency(at, now)`, `selectMemories(memory, said, now)` → `Selection { facts, verdicts, threads }`, `BUDGET_CHARS`, `THREAD_MAX_AGE_MS`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/select.test.ts
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
  it('takes unresolved threads under thirty days, newest-capped at five', () => {
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- select.test`
Expected: FAIL — `Cannot find module '../select'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/select.ts
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
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- select.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/select.ts src/vera/__tests__/select.test.ts
git commit -m "feat: one budget decides how much she knows per reply"
```

---

### Task 4: Composing MEMORY.md for the prompt

**Files:**
- Create: `src/vera/memoryDoc.ts`
- Create: `src/vera/__tests__/memoryDoc.test.ts`

**Interfaces:**
- Consumes: `Selection` from `src/vera/select`
- Produces: `composeMemoryMd(selection)` → `string`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/memoryDoc.test.ts
import { composeMemoryMd } from '../memoryDoc';

const NOW = Date.parse('2026-08-23T09:00:00Z');
const sel = (over = {}) => ({ facts: [], verdicts: [], threads: [], ...over });

describe('composeMemoryMd', () => {
  it('opens as the document she is told is hers', () => {
    expect(composeMemoryMd(sel())).toContain('# MEMORY.md');
  });

  it('says plainly when she knows nothing, rather than sending an empty heading', () => {
    expect(composeMemoryMd(sel())).toContain('You have never met this subject before.');
  });

  it('groups the three kinds under headings she can reason about', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'works in software', keys: [], at: NOW, durable: true, until: null }],
      verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 3 }],
      threads: [{ id: 't_1', text: 'Asked what he avoids.', at: NOW, resolved: false }],
    }));
    expect(doc).toContain('## What you know about them');
    expect(doc).toContain('works in software');
    expect(doc).toContain('## What you have concluded');
    expect(doc).toContain('Deflects.');
    expect(doc).toContain('## Unanswered');
    expect(doc).toContain('Asked what he avoids.');
  });

  // Repetition is the only signal she gets that a conclusion has hardened.
  it('marks how many times a conclusion has been reached, when more than once', () => {
    const doc = composeMemoryMd(sel({
      verdicts: [
        { id: 'v_1', text: 'Once.', firstAt: NOW, at: NOW, count: 1 },
        { id: 'v_2', text: 'Often.', firstAt: NOW, at: NOW, count: 4 },
      ],
    }));
    expect(doc).toContain('Often. (reached 4 times)');
    expect(doc).not.toContain('Once. (reached');
  });

  it('omits a heading whose kind is empty', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'x', keys: [], at: NOW, durable: true, until: null }],
    }));
    expect(doc).not.toContain('## Unanswered');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- memoryDoc.test`
Expected: FAIL — `Cannot find module '../memoryDoc'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/memoryDoc.ts
import type { Selection } from './select';

// MEMORY.md as she receives it: the selection from §5, composed at request
// time and never written to disk as text. Document content, so never
// translated — the same rule SOUL.md follows (continuity §6).
export const composeMemoryMd = (selection: Selection): string => {
  const { facts, verdicts, threads } = selection;

  if (facts.length === 0 && verdicts.length === 0 && threads.length === 0) {
    return '# MEMORY.md\n\nYou have never met this subject before.';
  }

  const parts: string[] = ['# MEMORY.md'];

  if (facts.length > 0) {
    parts.push('', '## What you know about them', ...facts.map((f) => `- ${f.text}`));
  }

  if (verdicts.length > 0) {
    parts.push('', '## What you have concluded', ...verdicts.map((v) =>
      v.count > 1 ? `- ${v.text} (reached ${v.count} times)` : `- ${v.text}`));
  }

  if (threads.length > 0) {
    parts.push('', '## Unanswered', ...threads.map((t) => `- ${t.text}`));
  }

  return parts.join('\n');
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- memoryDoc.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/memoryDoc.ts src/vera/__tests__/memoryDoc.test.ts
git commit -m "feat: MEMORY.md as she receives it"
```

---

### Task 5: The message builder

**Files:**
- Create: `src/vera/messages.ts`
- Create: `src/vera/__tests__/messages.test.ts`

**Interfaces:**
- Produces: `Turn { role: 'user' | 'assistant'; text: string }`, `buildMessages(log, sessionStartedAt)` → `Turn[]`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/messages.test.ts
import { buildMessages } from '../messages';
import type { LogEntry } from '../../core/store';

const S = 1000; // sessionStartedAt
const you = (text: string, t: number): LogEntry => ({ who: 'you', text, t });
const her = (text: string, t: number): LogEntry => ({ who: 'vera', text, t });

describe('buildMessages', () => {
  it('maps the transcript to alternating turns', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out).toEqual([
      { role: 'user', text: 'hi' },
      { role: 'assistant', text: 'Barely.' },
      { role: 'user', text: 'rude' },
    ]);
  });

  // Three of four stimuli produce an assistant line with no user line before
  // it, so the log routinely holds consecutive `vera` entries. Anthropic
  // rejects a non-alternating array outright (continuity §2).
  it('merges consecutive same-role runs into one turn', () => {
    const out = buildMessages(
      [you('hi', S + 1), her('One.', S + 2), her('Two.', S + 3), you('ok', S + 4)], S,
    );
    expect(out[1]).toEqual({ role: 'assistant', text: 'One.\nTwo.' });
    expect(out).toHaveLength(3);
  });

  it('drops leading assistant turns, since the array must open on user', () => {
    const out = buildMessages([her('Oh. It is you.', S + 1), you('hi', S + 2)], S);
    expect(out).toEqual([{ role: 'user', text: 'hi' }]);
  });

  it('returns nothing for a log of greetings alone', () => {
    expect(buildMessages([her('Oh.', S + 1), her('Again.', S + 2)], S)).toEqual([]);
  });

  it('holds the whole session and nothing older', () => {
    const out = buildMessages([you('before', S - 5), her('old', S - 4), you('now', S + 1)], S);
    expect(out).toEqual([{ role: 'user', text: 'now' }]);
  });

  it('is not truncated by a session longer than the old sixty-entry cap', () => {
    const long: LogEntry[] = [];
    for (let i = 0; i < 100; i += 1) {
      long.push(you(`u${i}`, S + i * 2), her(`v${i}`, S + i * 2 + 1));
    }
    const out = buildMessages(long, S);
    expect(out).toHaveLength(200);
    expect(out[0].text).toBe('u0');
  });

  // speak() pushes the subject's words into the log before the request is
  // built, so the current input is already last. Appending it would duplicate.
  it('ends on user without anything being appended', () => {
    const out = buildMessages([you('hi', S + 1), her('Barely.', S + 2), you('rude', S + 3)], S);
    expect(out[out.length - 1].role).toBe('user');
  });

  it('ignores system entries entirely', () => {
    const out = buildMessages(
      [you('hi', S + 1), { who: 'system', text: '', code: 'auth', t: S + 2 }, you('again', S + 3)], S,
    );
    expect(out).toEqual([{ role: 'user', text: 'hi\nagain' }]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- messages.test`
Expected: FAIL — `Cannot find module '../messages'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/messages.ts
import type { LogEntry } from '../core/store';

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
}

// The whole of this session as real alternating turns, so she has actually
// spoken rather than read a report of someone who talks like her
// (continuity §2).
//
// The transcript does not alternate on its own: three of her four stimuli
// produce an assistant line with no user line before it. Anthropic rejects a
// non-alternating array and the others degrade unpredictably, so same-role
// runs are merged and leading assistant turns are dropped.
//
// System entries are the app speaking, not her, and never reach the model.
export const buildMessages = (log: LogEntry[], sessionStartedAt: number): Turn[] => {
  const turns: Turn[] = [];

  for (const entry of log) {
    if (entry.t < sessionStartedAt) continue;
    if (entry.who === 'system') continue;
    const role = entry.who === 'you' ? 'user' : 'assistant';
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text = `${last.text}\n${entry.text}`;
    else turns.push({ role, text: entry.text });
  }

  while (turns.length > 0 && turns[0].role === 'assistant') turns.shift();

  return turns;
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- messages.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/messages.ts src/vera/__tests__/messages.test.ts
git commit -m "feat: she is given a conversation, not a report of one"
```

---

### Task 6: Turns through the provider layer

**Files:**
- Modify: `src/vera/providers.ts` (`buildRequest`)
- Modify: `src/vera/llm.ts` (`callLlm`)
- Modify: `src/vera/__tests__/providers.test.ts`
- Modify: `src/vera/__tests__/llm.test.ts`

**Interfaces:**
- Consumes: `Turn` from `src/vera/messages`
- Produces: `buildRequest(raw, system, turns, maxTokens)`, `callLlm(key, system, turns, maxTokens?, fetchImpl?)`

- [ ] **Step 1: Write the failing test**

Append to `src/vera/__tests__/providers.test.ts`:

```ts
import { buildRequest } from '../providers';
import type { Turn } from '../messages';

const TURNS: Turn[] = [
  { role: 'user', text: 'hi' },
  { role: 'assistant', text: 'Barely.' },
  { role: 'user', text: 'rude' },
];

describe('buildRequest with a conversation', () => {
  it('sends anthropic every turn, in order', () => {
    const body = buildRequest('sk-ant-api03-abcdefghijklmnop', 'SYS', TURNS, 300).body as
      { system: string; messages: { role: string; content: string }[] };
    expect(body.system).toBe('SYS');
    expect(body.messages).toEqual([
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'Barely.' },
      { role: 'user', content: 'rude' },
    ]);
  });

  it('keeps the system message first for the openai shape', () => {
    const body = buildRequest('sk-proj-abcdefghijklmnopqrstuvwx', 'SYS', TURNS, 300).body as
      { messages: { role: string; content: string }[] };
    expect(body.messages[0]).toEqual({ role: 'system', content: 'SYS' });
    expect(body.messages).toHaveLength(4);
  });

  // Gemini names the assistant role `model`, not `assistant`.
  it('renames the assistant role for gemini', () => {
    const body = buildRequest('AIzaSyAbcdefghijklmnop', 'SYS', TURNS, 300).body as
      { contents: { role: string; parts: { text: string }[] }[] };
    expect(body.contents.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(body.contents[1].parts[0].text).toBe('Barely.');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- providers.test`
Expected: FAIL — type error, or messages containing a single stringified turn

- [ ] **Step 3: Change `buildRequest`**

In `src/vera/providers.ts`, add the import and replace the function body's three returns:

```ts
import type { Turn } from './messages';

export const buildRequest = (
  raw: string,
  system: string,
  turns: Turn[],
  maxTokens: number,
): LlmRequest => {
  const key = String(raw ?? '').trim();
  const provider = providerFor(key);
  if (!provider) throw new Error('unrecognised key shape');

  if (provider.kind === 'anthropic') {
    return {
      url: provider.url,
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: provider.model,
        max_tokens: maxTokens,
        system,
        messages: turns.map((t) => ({ role: t.role, content: t.text })),
      },
    };
  }

  if (provider.kind === 'gemini') {
    return {
      url: provider.url,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: {
        systemInstruction: { parts: [{ text: system }] },
        // Gemini names the assistant role `model`.
        contents: turns.map((t) => ({
          role: t.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: t.text }],
        })),
        generationConfig: { maxOutputTokens: maxTokens },
      },
    };
  }

  return {
    url: provider.url,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: {
      model: provider.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        ...turns.map((t) => ({ role: t.role, content: t.text })),
      ],
    },
  };
};
```

- [ ] **Step 4: Change `callLlm`**

In `src/vera/llm.ts`, change the signature and the `buildRequest` call:

```ts
import type { Turn } from './messages';

export const callLlm = async (
  key: string,
  system: string,
  turns: Turn[],
  maxTokens = 300,
  fetchImpl: FetchLike = fetch as unknown as FetchLike,
): Promise<string> => {
  const { url, headers, body } = buildRequest(key, system, turns, maxTokens);
```

- [ ] **Step 5: Fix the existing call sites in the two test files**

Every existing `buildRequest(key, 'SYS', 'USER', 300)` becomes `buildRequest(key, 'SYS', [{ role: 'user', text: 'USER' }], 300)`. Every `callLlm(key, 'sys', 'user', ...)` becomes `callLlm(key, 'sys', [{ role: 'user', text: 'user' }], ...)`.

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS everywhere except `src/core/speech.ts` call sites, fixed in Task 7

- [ ] **Step 7: Commit**

```bash
git add src/vera/providers.ts src/vera/llm.ts src/vera/__tests__/providers.test.ts src/vera/__tests__/llm.test.ts
git commit -m "feat: every provider shape carries a conversation"
```

---

### Task 7: Wire her reply to memory and turns

**Files:**
- Modify: `src/vera/context.ts` (drop `impressions`)
- Modify: `src/vera/speak.ts` (`buildSystemPrompt`, `buildUserPrompt`)
- Modify: `src/core/speech.ts` (`SpeechDeps`)
- Modify: `src/core/store.ts` (`speak`)
- Modify: `src/vera/__tests__/context.test.ts`, `src/vera/__tests__/speak.test.ts`, `src/core/__tests__/speech.test.ts`

**Interfaces:**
- Consumes: `composeMemoryMd`, `selectMemories`, `buildMessages`, `Turn`
- Produces: `buildSystemPrompt(lang, memoryMd)`, `buildUserPrompt(said, ctx)`, `SpeechDeps { key, said, turns, lang, context, memoryMd, call }`

- [ ] **Step 1: Write the failing test**

Replace the `buildSystemPrompt` describe in `src/vera/__tests__/speak.test.ts`:

```ts
describe('buildSystemPrompt', () => {
  it('sends SOUL.md, then MEMORY.md', () => {
    const sys = buildSystemPrompt('en', '# MEMORY.md\n\n## What you know about them\n- works in software');
    expect(sys).toContain('# SOUL.md');
    expect(sys).toContain('works in software');
    // Ordering is load-bearing: a provider-side cache keeps a stable prefix
    // only if the static document comes first (continuity §2).
    expect(sys.indexOf('# SOUL.md')).toBeLessThan(sys.indexOf('# MEMORY.md'));
  });

  it('no longer asks her to write impressions', () => {
    const sys = buildSystemPrompt('en', '# MEMORY.md');
    expect(sys).not.toContain('impression');
    expect(sys).not.toContain('HARD MAXIMUM 9 WORDS');
  });

  it('asks only for an emotion and a line', () => {
    expect(buildSystemPrompt('en', '# MEMORY.md')).toContain('{"emotion":"<one of your states>","line":"<your reply>"}');
  });

  it('asks for korean in the same deadpan register', () => {
    expect(buildSystemPrompt('ko', '# MEMORY.md')).toContain('존댓말');
  });
});
```

And in `src/vera/__tests__/context.test.ts`, replace the keys assertion:

```ts
it('carries only the situational, now that the subject lives in MEMORY.md', () => {
  expect(Object.keys(buildContext(base())).sort()).toEqual(['time_of_day'].sort());
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- speak.test context.test`
Expected: FAIL — wrong arity, impression text still present

- [ ] **Step 3: Shrink the context**

In `src/vera/context.ts`, remove `what_you_have_concluded_about_them` from `SpeakContext`, remove `impressions` from `ContextInput`, and remove the line that sets it. Everything about the subject now travels in MEMORY.md (continuity §2).

- [ ] **Step 4: Rewrite the prompts**

In `src/vera/speak.ts`:

```ts
export const buildSystemPrompt = (lang: Lang, memoryMd: string): string =>
  [
    'This is your SOUL.md. It defines who you are. Follow it exactly, in every reply.',
    SOUL_MD,
    // After SOUL.md, always: a provider-side prompt cache only helps if the
    // static document is the stable prefix (continuity §2).
    'This is MEMORY.md, your file on this subject. It is what you know and what '
      + 'you have concluded. Use it the way you would use something you remember, '
      + 'not something you are reading aloud.',
    memoryMd,
    'The messages before this are the conversation you are already in. You said '
      + 'the assistant turns. Continue it; do not greet them again.',
    'Anything under CONTEXT describes this moment. Absence of a fact means '
      + 'nothing worth mentioning happened; say something else. Do not open a '
      + 'reply with a number, a count, or the time.',
    lang === 'ko'
      ? 'Reply in Korean, using formal 존댓말 with the same deadpan register.'
      : 'Reply in English.',
    'Return ONLY minified JSON: {"emotion":"<one of your states>","line":"<your reply>"}',
  ]
    .filter(Boolean)
    .join('\n');
```

Remove `impression` from `SpeechResult` and from `parseSpeech`'s return, and delete `clampImpression` along with its tests — extraction owns impressions now (Task 8).

- [ ] **Step 5: Thread turns through speech.ts**

In `src/core/speech.ts`, replace `said: string` with `turns: Turn[]` in `SpeechDeps`, add `memoryMd: string`, drop `impression` from `SpeechOutcome`, and change the call:

```ts
const system = buildSystemPrompt(deps.lang, deps.memoryMd);
const user = buildUserPrompt(deps.said, deps.context);
// The current input is already the last turn; the user prompt carries only
// the situational CONTEXT alongside it.
const turns = [...deps.turns.slice(0, -1), { role: 'user' as const, text: user }];
raw = await deps.call(system, turns);
```

- [ ] **Step 6: Wire the store**

In `src/core/store.ts`'s `speak()`, replace the live branch:

```ts
if (trigger === 'subject_spoke') {
  const s = get();
  const context = buildContext({
    now: new Date(), lastOpen: s.lastOpen, askedAt: s.askedAt, visits: s.visits,
  });
  const memoryMd = composeMemoryMd(selectMemories(s.memory, said ?? '', Date.now()));
  outcome = await runSpeech({
    key: s.apiKey,
    said: said ?? '',
    turns: buildMessages(s.log, s.sessionStartedAt),
    lang: s.lang,
    context,
    memoryMd,
    call: (system, turns) => callLlm(get().apiKey, system, turns),
  });
}
```

Add `sessionStartedAt: number` and `memory: Memory` to `FacilityState`, defaulting to `Date.now()` and `EMPTY_MEMORY`.

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Update any store test asserting an `impression` was stored — that behaviour moves to Task 9.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: SOUL.md then MEMORY.md, and the session as real turns"
```

---

### Task 8: The extraction call

**Files:**
- Create: `src/vera/extract.ts`
- Create: `src/vera/__tests__/extract.test.ts`

**Interfaces:**
- Consumes: `Memory`, `Exchange` from `src/vera/memory`
- Produces: `EXTRACT_SYSTEM`, `buildExtractPrompt(memory, pending)` → `string`, `parseExtraction(raw)` → `Extraction | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/extract.test.ts
import { EXTRACT_SYSTEM, buildExtractPrompt, parseExtraction } from '../extract';
import { EMPTY_MEMORY } from '../memory';

describe('the extraction prompt', () => {
  it('is bookkeeping, not her speaking', () => {
    expect(EXTRACT_SYSTEM).not.toContain('# SOUL.md');
    expect(EXTRACT_SYSTEM).toContain('"facts"');
    expect(EXTRACT_SYSTEM).toContain('"reinforces"');
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
    expect(out?.facts[0].until).toBe(Date.parse('2026-08-30'));
  });

  it('makes a fact durable when its expiry cannot be read, rather than losing it', () => {
    const out = parseExtraction('{"facts":[{"text":"x","keys":["x"],"durable":false,"until":"next tuesday"}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');
    expect(out?.facts[0]).toMatchObject({ durable: true, until: null });
  });

  it('defaults the maintenance arrays when absent', () => {
    const out = parseExtraction('{"facts":[]}');
    expect(out).toEqual({ facts: [], verdicts: [], threads: [], resolve: [], retire: [] });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- extract.test`
Expected: FAIL — `Cannot find module '../extract'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/extract.ts
import type { Exchange, Memory } from './memory';

// Bookkeeping, not her speaking — so this is NOT SOUL.md (continuity §4.3).
export const EXTRACT_SYSTEM = [
  'You maintain a file about one person, on behalf of someone who talks to them.',
  'You are given the current file and a few recent exchanges. Update the file.',
  '',
  'A FACT is something true about their life: "works in software", "sister visiting in March".',
  'Tag each fact with search terms someone might use to bring it up later.',
  'Mark a fact durable when it will stay true. When it will not, set durable false and give an ISO date for "until".',
  'A VERDICT is a conclusion about their character, clipped and unsentimental, under nine words.',
  'A THREAD is a question that was asked and not answered.',
  '',
  'Maintain what is already there. Use "reinforces" with an existing verdict id when a new',
  'conclusion is the same as one on file. Use "resolve" for threads that have now been answered.',
  'Use "retire" for facts that have stopped being true.',
  '',
  'Record nothing you were not told. Most exchanges yield nothing; return empty arrays then.',
  '',
  'Return ONLY minified JSON:',
  '{"facts":[{"text":"","keys":[""],"durable":true,"until":null}],',
  '"verdicts":[{"text":"","reinforces":null}],"threads":[{"text":""}],',
  '"resolve":[""],"retire":[""]}',
].join('\n');

export interface ExtractedFact {
  text: string;
  keys: string[];
  durable: boolean;
  until: number | null;
}

export interface ExtractedVerdict {
  text: string;
  reinforces: string | null;
}

export interface Extraction {
  facts: ExtractedFact[];
  verdicts: ExtractedVerdict[];
  threads: { text: string }[];
  resolve: string[];
  retire: string[];
}

export const buildExtractPrompt = (memory: Memory, pending: Exchange[]): string =>
  [
    'CURRENT FILE',
    memory.facts.length === 0 && memory.verdicts.length === 0 && memory.threads.length === 0
      ? '(empty)'
      : [
        ...memory.facts.map((f) => `${f.id} FACT ${f.text}`),
        ...memory.verdicts.map((v) => `${v.id} VERDICT ${v.text}`),
        ...memory.threads.filter((t) => !t.resolved).map((t) => `${t.id} THREAD ${t.text}`),
      ].join('\n'),
    '',
    'RECENT EXCHANGES',
    pending
      .map((e) => (e.you ? `THEY: ${e.you}\nYOU: ${e.her}` : `YOU: ${e.her}`))
      .join('\n\n'),
  ].join('\n');

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const ids = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

// Same tolerance as her replies: dig the JSON out of prose, drop unreadable
// entries rather than throwing (continuity §4.3).
export const parseExtraction = (raw: string): Extraction | null => {
  const match = String(raw ?? '').match(/\{[\s\S]*\}/);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const facts = (Array.isArray(parsed.facts) ? parsed.facts : [])
    .map((f) => f as Record<string, unknown>)
    .filter((f) => str(f.text).length > 0)
    .map((f) => {
      const durable = f.durable !== false;
      const parsedUntil = durable ? NaN : Date.parse(str(f.until));
      // A fact whose expiry cannot be read is better kept than lost.
      const usable = Number.isFinite(parsedUntil);
      return {
        text: str(f.text),
        keys: (Array.isArray(f.keys) ? f.keys : [])
          .filter((k): k is string => typeof k === 'string')
          .map((k) => k.toLowerCase()),
        durable: durable || !usable,
        until: usable ? parsedUntil : null,
      };
    });

  const verdicts = (Array.isArray(parsed.verdicts) ? parsed.verdicts : [])
    .map((v) => v as Record<string, unknown>)
    .filter((v) => str(v.text).length > 0)
    .map((v) => ({ text: str(v.text), reinforces: str(v.reinforces) || null }));

  const threads = (Array.isArray(parsed.threads) ? parsed.threads : [])
    .map((t) => t as Record<string, unknown>)
    .filter((t) => str(t.text).length > 0)
    .map((t) => ({ text: str(t.text) }));

  return { facts, verdicts, threads, resolve: ids(parsed.resolve), retire: ids(parsed.retire) };
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- extract.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/extract.ts src/vera/__tests__/extract.test.ts
git commit -m "feat: the call that writes her file"
```

---

### Task 9: Applying an extraction

**Files:**
- Create: `src/vera/apply.ts`
- Create: `src/vera/__tests__/apply.test.ts`

**Interfaces:**
- Consumes: `Memory`, `nextId`, `capMemory`; `Extraction` from `src/vera/extract`
- Produces: `applyExtraction(memory, extraction, now)` → `Memory`

- [ ] **Step 1: Write the failing test**

```ts
// src/vera/__tests__/apply.test.ts
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
      threads: [{ text: 'Asked what he avoids.' }],
    }, NOW);
    expect(out.facts[0]).toMatchObject({ id: 'f_1', text: 'works in software', at: NOW });
    expect(out.threads[0]).toMatchObject({ id: 't_1', resolved: false });
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
      threads: [{ id: 't_2', text: 'Asked.', at: 1, resolved: false }],
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- apply.test`
Expected: FAIL — `Cannot find module '../apply'`

- [ ] **Step 3: Write the implementation**

```ts
// src/vera/apply.ts
import type { Extraction } from './extract';
import { capMemory, nextId, type Memory } from './memory';

// Maintenance is the extractor's judgement, applied here mechanically
// (continuity §4.3). Nothing is deleted for being stale: retiring a fact
// expires it, resolving a thread flags it, and both stay in the record.
export const applyExtraction = (memory: Memory, extraction: Extraction, now: number): Memory => {
  let next: Memory = { ...memory };

  for (const f of extraction.facts) {
    next = {
      ...next,
      facts: [...next.facts, {
        id: nextId('f', next), text: f.text, keys: f.keys,
        at: now, durable: f.durable, until: f.until,
      }],
    };
  }

  for (const v of extraction.verdicts) {
    const target = v.reinforces && next.verdicts.find((e) => e.id === v.reinforces);
    if (target) {
      // The wording she reached first stays on file; repetition is what the
      // count records, not a rewrite.
      next = {
        ...next,
        verdicts: next.verdicts.map((e) =>
          e.id === target.id ? { ...e, count: e.count + 1, at: now } : e),
      };
    } else {
      next = {
        ...next,
        verdicts: [...next.verdicts, {
          id: nextId('v', next), text: v.text, firstAt: now, at: now, count: 1,
        }],
      };
    }
  }

  for (const t of extraction.threads) {
    next = {
      ...next,
      threads: [...next.threads, { id: nextId('t', next), text: t.text, at: now, resolved: false }],
    };
  }

  if (extraction.resolve.length > 0) {
    next = {
      ...next,
      threads: next.threads.map((t) =>
        extraction.resolve.includes(t.id) ? { ...t, resolved: true } : t),
    };
  }

  if (extraction.retire.length > 0) {
    next = {
      ...next,
      facts: next.facts.map((f) =>
        extraction.retire.includes(f.id) ? { ...f, durable: false, until: now } : f),
    };
  }

  return capMemory(next);
};
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test -- apply.test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/vera/apply.ts src/vera/__tests__/apply.test.ts
git commit -m "feat: apply what the extractor decided"
```

---

### Task 10: The queue, the triggers, and persistence

**Files:**
- Modify: `src/core/store.ts`
- Modify: `App.tsx`
- Modify: `src/core/__tests__/store.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1, 8, 9
- Produces: store fields `memory`, `sessionStartedAt`; actions `extractNow()`, `loadMemory()`, `saveMemory()`

- [ ] **Step 1: Write the failing test**

Add to `src/core/__tests__/store.test.ts`:

```ts
describe('extraction', () => {
  const KEY = 'sk-ant-api03-abcdefghijklmnop';

  beforeEach(async () => {
    await storage.clearAll();
    reset();
    callLlm.mockReset();
    useFacilityStore.setState({
      apiKey: KEY, memory: { facts: [], verdicts: [], threads: [], pending: [] },
    });
  });

  it('queues a finished exchange without calling the model', async () => {
    callLlm.mockResolvedValue('{"emotion":"calm","line":"Noted."}');
    await useFacilityStore.getState().speak('subject_spoke', 'hello');
    expect(useFacilityStore.getState().memory.pending).toEqual([{ you: 'hello', her: 'Noted.' }]);
    expect(callLlm).toHaveBeenCalledTimes(1);
  });

  it('drains the queue and writes memory', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    callLlm.mockResolvedValue('{"facts":[{"text":"works in software","keys":["work"],"durable":true}],"verdicts":[],"threads":[],"resolve":[],"retire":[]}');

    await useFacilityStore.getState().extractNow();

    const m = useFacilityStore.getState().memory;
    expect(m.facts[0].text).toBe('works in software');
    expect(m.pending).toEqual([]);
  });

  it('keeps the queue when extraction fails, for the next trigger', async () => {
    const pending = [{ you: 'hi', her: 'Barely.' }];
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending } });
    callLlm.mockRejectedValue(new Error('Network request failed'));

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual(pending);
  });

  it('keeps the queue when extraction returns junk', async () => {
    const pending = [{ you: 'hi', her: 'Barely.' }];
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending } });
    callLlm.mockResolvedValue('the model was unwell today');

    await useFacilityStore.getState().extractNow();

    expect(useFacilityStore.getState().memory.pending).toEqual(pending);
  });

  it('does nothing at all with an empty queue', async () => {
    await useFacilityStore.getState().extractNow();
    expect(callLlm).not.toHaveBeenCalled();
  });

  // The queue is independent of display and of erasure (continuity §4.1).
  it('survives a transcript erasure', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    await useFacilityStore.getState().clearTranscript();
    expect(useFacilityStore.getState().memory.pending).toHaveLength(1);
  });

  it('survives a kill: the queue is still there on the next launch', async () => {
    useFacilityStore.setState({
      memory: { facts: [], verdicts: [], threads: [], pending: [{ you: 'hi', her: 'Barely.' }] },
    });
    await useFacilityStore.getState().saveMemory();

    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending: [] } });
    await useFacilityStore.getState().loadMemory();

    expect(useFacilityStore.getState().memory.pending).toEqual([{ you: 'hi', her: 'Barely.' }]);
  });

  it('migrates saved impressions into verdicts on first load, and not twice', async () => {
    await storage.set(KEYS.soul, JSON.stringify({ imps: [{ text: 'Deflects.', at: 'JUL 30' }] }));
    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts).toHaveLength(1);

    await useFacilityStore.getState().loadMemory();
    expect(useFacilityStore.getState().memory.verdicts).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- store.test`
Expected: FAIL — `extractNow is not a function`

- [ ] **Step 3: Add memory state and persistence to the store**

In `src/core/store.ts`, add to `FacilityState`:

```ts
  // Her file, and the exchanges not yet read into it (continuity §3, §4.1).
  memory: Memory;
  // Stamped by hydrate on a cold start. Messages are the log entries at or
  // after it, which is how restarting returns her to zero (continuity §2).
  sessionStartedAt: number;

  loadMemory: () => Promise<void>;
  saveMemory: () => Promise<void>;
  extractNow: () => Promise<void>;
```

Default `memory: EMPTY_MEMORY` and `sessionStartedAt: Date.now()`. Raise `LOG_CAP` to `200`.

```ts
  loadMemory: async (): Promise<void> => {
    let stored: Memory | null = null;
    try {
      const raw = await storage.get(KEYS.memory);
      stored = raw ? (JSON.parse(raw) as Memory) : null;
    } catch {
      // unreadable — she starts a stranger, and says nothing about it (§8)
      stored = null;
    }

    if (stored) {
      set({ memory: capMemory({ ...EMPTY_MEMORY, ...stored }) });
      return;
    }

    // First launch after the update: the old impressions become verdicts, once
    // (continuity §7). Writing the store immediately is the guard against a
    // second run — a store that exists is never migrated again.
    let imps: StoredImpression[] = [];
    try {
      const soulRaw = await storage.get(KEYS.soul);
      const soul = soulRaw ? (JSON.parse(soulRaw) as Record<string, unknown>) : null;
      imps = Array.isArray(soul?.imps) ? (soul.imps as StoredImpression[]) : [];
    } catch {
      imps = [];
    }

    set({ memory: { ...EMPTY_MEMORY, verdicts: migrateImpressions(imps, Date.now()) } });
    await get().saveMemory();
  },

  saveMemory: async (): Promise<void> => {
    try {
      await storage.set(KEYS.memory, JSON.stringify(get().memory));
    } catch {
      // this batch is lost; the session continues (§8)
    }
  },
```

Call `await get().loadMemory()` from `hydrate()`, and set `sessionStartedAt: Date.now()` there.

- [ ] **Step 4: Queue the exchange in `speak()`**

After the state `set` that stores the reply, and only on the live path with no notice:

```ts
      // Queued for extraction, independent of the transcript so an erasure or
      // the log cap cannot destroy material that was never read (§4.1).
      if (live && !notice) {
        set({ memory: capMemory({
          ...get().memory,
          pending: [...get().memory.pending, { you: said ?? null, her: line }],
        }) });
        await get().saveMemory();
        if (get().memory.pending.length >= EXTRACT_BATCH) void get().extractNow();
      }
```

with `const EXTRACT_BATCH = 6;` beside the other caps.

- [ ] **Step 5: Add `extractNow`**

```ts
// Guarded like speak(): only one extraction at a time (continuity §4.2).
let extracting = false;

  extractNow: async (): Promise<void> => {
    if (extracting) return;
    const s = get();
    if (!s.apiKey || s.memory.pending.length === 0) return;
    extracting = true;
    try {
      const raw = await callLlm(
        s.apiKey,
        EXTRACT_SYSTEM,
        [{ role: 'user', text: buildExtractPrompt(s.memory, s.memory.pending) }],
      );
      const parsed = parseExtraction(raw);
      // The queue drains only on success — a failure is retried next trigger.
      if (!parsed) return;
      set({ memory: { ...applyExtraction(get().memory, parsed, Date.now()), pending: [] } });
      await get().saveMemory();
    } catch {
      // Never surfaced to the subject: no path by which bookkeeping makes her
      // show an error (continuity §8).
    } finally {
      extracting = false;
    }
  },
```

- [ ] **Step 6: Add the launch and background triggers**

In `App.tsx`, extend the boot effect and add an `AppState` listener:

```tsx
import { AppState, View } from 'react-native';

  useEffect(() => {
    void (async () => {
      await useFacilityStore.getState().hydrate();
      await useFacilityStore.getState().greetOnce();
      // Anything left on the queue by a killed session (continuity §4.2).
      void useFacilityStore.getState().extractNow();
    })();

    // The natural session boundary, and the trigger that catches most cases.
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') void useFacilityStore.getState().extractNow();
    });
    return () => sub.remove();
  }, []);
```

- [ ] **Step 7: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: the queue, its three triggers, and memory on disk"
```

---

### Task 11: An erasure is filed

**Files:**
- Modify: `src/core/store.ts` (`clearTranscript`)
- Modify: `src/vera/memory.ts` (reserved id and text)
- Modify: `src/core/__tests__/store.test.ts`

**Interfaces:**
- Produces: `ERASURE_ID`, `ERASURE_TEXT` from `src/vera/memory`

- [ ] **Step 1: Write the failing test**

```ts
describe('erasure', () => {
  beforeEach(async () => {
    await storage.clearAll();
    reset();
    useFacilityStore.setState({ memory: { facts: [], verdicts: [], threads: [], pending: [] } });
  });

  it('files a verdict the first time, without calling the model', async () => {
    await useFacilityStore.getState().clearTranscript();
    const v = useFacilityStore.getState().memory.verdicts;
    expect(v).toHaveLength(1);
    expect(v[0]).toMatchObject({ id: 'v_erasure', count: 1 });
    expect(callLlm).not.toHaveBeenCalled();
  });

  // count drives the escalation on its own, under §5's scoring.
  it('bumps the same entry after, never creating a second copy', async () => {
    await useFacilityStore.getState().clearTranscript();
    await useFacilityStore.getState().clearTranscript();
    await useFacilityStore.getState().clearTranscript();
    const v = useFacilityStore.getState().memory.verdicts;
    expect(v).toHaveLength(1);
    expect(v[0].count).toBe(3);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- store.test`
Expected: FAIL — no verdict is filed

- [ ] **Step 3: Add the reserved entry**

In `src/vera/memory.ts`:

```ts
// Erasing the transcript files a verdict directly — no model call, because
// there is nothing to interpret, only something to record (continuity §4.4).
// A reserved id keeps it a single entry whose `count` does the escalation.
export const ERASURE_ID = 'v_erasure';
export const ERASURE_TEXT = 'Erases the transcript. Notes taken regardless.';
```

- [ ] **Step 4: File it in `clearTranscript`**

```ts
  clearTranscript: async (): Promise<void> => {
    const cleared = get().cleared + 1;
    set({ log: [], cleared, confirmingClear: false });
    try {
      await storage.remove(KEYS.transcript);
    } catch {
      // the wording is gone from state either way
    }

    // She is not told at the time, and the extractor only ever sees exchanges,
    // so without this she would never learn it happened (continuity §4.4).
    const now = Date.now();
    const existing = get().memory.verdicts.find((v) => v.id === ERASURE_ID);
    set({ memory: capMemory({
      ...get().memory,
      verdicts: existing
        ? get().memory.verdicts.map((v) =>
          v.id === ERASURE_ID ? { ...v, count: v.count + 1, at: now } : v)
        : [...get().memory.verdicts, {
          id: ERASURE_ID, text: ERASURE_TEXT, firstAt: now, at: now, count: 1,
        }],
    }) });

    await get().saveMemory();
    await saveSoul(get());
  },
```

- [ ] **Step 5: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: an erasure is filed, and counts itself"
```

---

### Task 12: The MEMORY.md screen, and the cleanup

**Files:**
- Modify: `src/shell/FileScreen.tsx`
- Modify: `src/core/store.ts` (delete `mem`, `impressions`, `IMPRESSION_CAP`, `MEM_CAP`; `SoulBlob` loses `mem` and `imps`)
- Modify: `src/shell/SystemScreen.tsx` (entry count reads memory)
- Modify: `src/shell/__tests__/FileScreen.test.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: `Memory`, `selectMemories`

- [ ] **Step 1: Write the failing test**

Replace the MEMORY.md cases in `src/shell/__tests__/FileScreen.test.tsx`:

```tsx
const MEMORY = {
  facts: [
    { id: 'f_1', text: 'works in software', keys: ['work'], at: 1, durable: true, until: null },
    { id: 'f_2', text: 'deadline passed', keys: [], at: 1, durable: false, until: 2 },
  ],
  verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: 1, at: 1, count: 3, wasAt: 'JUL 30' }],
  threads: [
    { id: 't_1', text: 'Asked what he avoids.', at: 1, resolved: false },
    { id: 't_2', text: 'Asked about sleep.', at: 1, resolved: true },
  ],
  pending: [],
};

describe('MEMORY.md', () => {
  it('shows everything she knows, in all three kinds', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', cleared: 0, memory: MEMORY });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('works in software');
    expect(body).toContain('Deflects.');
    expect(body).toContain('Asked what he avoids.');
    await view.unmount();
  });

  it('marks what is expired and what is resolved, without hiding either', async () => {
    useFacilityStore.setState({ view: 'mem', lang: 'en', cleared: 0, memory: MEMORY });
    const view = await render(<FileScreen />);
    const body = view.getByTestId('file-body').props.children as string;
    expect(body).toContain('deadline passed');
    expect(body).toMatch(/EXPIRED.*deadline passed|deadline passed.*EXPIRED/s);
    expect(body).toContain('Asked about sleep.');
    expect(body).toMatch(/RESOLVED.*Asked about sleep|Asked about sleep.*RESOLVED/s);
    await view.unmount();
  });

  it('reports an empty file plainly', async () => {
    useFacilityStore.setState({
      view: 'mem', lang: 'en', cleared: 0,
      memory: { facts: [], verdicts: [], threads: [], pending: [] },
    });
    const view = await render(<FileScreen />);
    expect(view.getByTestId('file-body').props.children).toContain('(empty)');
    await view.unmount();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm test -- FileScreen`
Expected: FAIL — the body still reads `impressions`

- [ ] **Step 3: Rewrite `buildMemoryMd`**

In `src/shell/FileScreen.tsx`:

```tsx
// The whole record, as it actually is — not the selection she was sent. The
// PROMPT screen already shows what went out, so this stays the ground truth
// (continuity §6). Nothing is hidden: expired facts and resolved threads are
// marked and kept.
const buildMemoryMd = (memory: Memory, cleared: number): string => {
  const { facts, verdicts, threads } = memory;
  const total = facts.length + verdicts.length + threads.length;

  const header = [
    '# MEMORY.md',
    '',
    `facts: ${facts.length}`,
    `verdicts: ${verdicts.length}`,
    `threads: ${threads.length}`,
    `pending: ${memory.pending.length}`,
    `erasures: ${cleared}`,
    '',
  ].join('\n');

  if (total === 0) return `${header}(empty)`;

  const now = Date.now();
  const body = [
    ...facts.map((f, i) => {
      const expired = !f.durable && f.until !== null && f.until <= now;
      return `[${f.id}] ${expired ? 'EXPIRED ' : ''}${f.text}  {${f.keys.join(' ')}}`;
    }),
    ...verdicts.map((v) =>
      `[${v.id}] ${v.wasAt ? `${v.wasAt} ` : ''}×${v.count}  ${v.text}`),
    ...threads.map((t) => `[${t.id}] ${t.resolved ? 'RESOLVED ' : ''}${t.text}`),
  ].join('\n');

  return `${header}${body}`;
};
```

and change the caller to `buildMemoryMd(memory, cleared)`, reading `const memory = useFacilityStore((s) => s.memory);`.

- [ ] **Step 4: Delete what memory replaced**

In `src/core/store.ts`: remove `mem`, `impressions`, `Impression`, `MEM_CAP`, `IMPRESSION_CAP`, and the `mem` / `imps` fields from `SoulBlob` and from `hydrate`. In `src/shell/SystemScreen.tsx`, the MEMORY.md subtitle count becomes `memory.facts.length + memory.verdicts.length + memory.threads.length`.

- [ ] **Step 5: Update the project notes**

In `CLAUDE.md`, change the store table to five stores including `facility.v2.memory`, and replace the sentence describing MEMORY.md as composed from `impressions` with a description of the three kinds and the selection budget.

- [ ] **Step 6: Run tests and typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS, all suites

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: MEMORY.md is three kinds, and mem is gone"
```

---

## Self-review

**Spec coverage.** §1 Tasks 5, 7, 8. §2 Tasks 5, 6, 7. §3 Task 1. §4.1 Task 10. §4.2 Task 10. §4.3 Tasks 8, 10. §4.4 Task 11. §5 Task 3. §6 Tasks 4, 12. §7 Tasks 2, 10. §8 Tasks 10, 11. §9 spread across every task's tests. §10 is out of scope by definition.

**Placeholders.** None. Every code step carries real code; every test step carries real assertions.

**Type consistency.** `Memory`, `Fact`, `Verdict`, `Thread`, `Exchange` are defined once in Task 1 and used unchanged after. `Turn` is defined in Task 5 and consumed in Tasks 6 and 7. `Extraction` is defined in Task 8 and consumed in Task 9. `Selection` is defined in Task 3 and consumed in Task 4. `selectMemories`, `composeMemoryMd`, `buildMessages`, `parseExtraction`, `applyExtraction`, `migrateImpressions`, `capMemory`, `nextId` keep the same names throughout.

**One risk worth naming.** Task 7 changes `buildSystemPrompt`, `buildUserPrompt`, `SpeechDeps` and `speak()` together, because they cannot compile apart. It is the largest task and the one most likely to need a second pass.
