# V.E.R.A.'s transmissions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** She sends one authored line to the lock screen at 11:00 and 16:00 each day, drawn from the register the subject has her in, off by default.

**Architecture:** Two `makeDaily` instances, one per time slot, sharing one channel. The lines live on `ModeDef` beside `bank`, so a register change rewrites the pending queue. A shuffled-bag planner built on `deck.ts` replaces the rooms' independent per-day draws, because a ten-line pool repeats where a 232-quote corpus does not.

**Tech Stack:** TypeScript, expo-notifications (lazily required), Zustand, jest + RTL v14.

**Spec:** `docs/superpowers/specs/2026-09-21-vera-transmissions-design.md`

## Global Constraints

- **Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.**
- **No test may make a real network request.** Mock `src/vera/llm.ts` with a `jest.requireActual` spread so `AuthError` stays a real class.
- All copy verbatim from `T` in `src/shell/strings.ts`; all hex from `palette` in `src/core/theme.ts`.
- **Repo style is single quotes.** An editor formatter here has previously reformatted files to double quotes.
- Verify with `npm test` and `npx tsc --noEmit`.
- RTL v14 is fully async: `await render(...)`, `await fireEvent.press(...)`, **`await view.unmount()`**.
- Touch only what the task names. Do not "improve" adjacent code, comments, or formatting.
- Commits carry no reference to the model or the tool that wrote them.
- Baseline before starting: **806 tests, 60 suites, tsc clean.**

---

## File Structure

| file | responsibility |
|---|---|
| `src/modules/daily.ts` | **modify** — extract `planDates`; add `Planner` and `planBag` |
| `src/modules/notify.ts` | **modify** — `days?` and `plan?` on `DailyConfig`; one comment |
| `src/vera/modes/types.ts` | **modify** — `TransmissionSlot`, the `transmissions` field |
| `src/vera/modes/default.ts` | **modify** — twenty lines |
| `src/vera/modes/supportive.ts` | **modify** — twenty lines |
| `src/vera/transmissions.ts` | **create** — pure: slots, horizon, channel, title, `linesFor` |
| `src/vera/transmissionsNotify.ts` | **create** — impure: the two notifiers and the three exports |
| `src/core/store.ts` | **modify** — two fields, two actions, the resync in `setMode`, `SoulBlob` |
| `src/shell/strings.ts` | **modify** — four keys per language |
| `src/shell/TransmissionRow.tsx` | **create** — the SYSTEM row |
| `src/shell/SystemScreen.tsx` | **modify** — one row |
| `App.tsx` | **modify** — one call after the rooms boot |

Six tasks. Each ends green and committable on its own. Tasks 1 and 2 are the shared machinery and must land before Task 4 can use them; Task 3 is independent of 1 and 2 and could be done at any point before Task 4.

---

## Task 1: The shuffled-bag planner

**Files:**
- Modify: `src/modules/daily.ts`
- Test: `src/modules/__tests__/daily.test.ts`

**Interfaces:**
- Consumes: `newDeck`, `current`, `advance`, `Rand` from `src/modules/deck.ts` (existing, unchanged).
- Produces: `planDates(now: Date, hour: number, days?: number): Date[]`, `type Planner = (now: Date, count: number, hour: number, days?: number, rand?: Rand) => PlannedQuote[]`, `planBag: Planner`. `planDaily` keeps its exact signature and behaviour.

**Why:** `planDaily` draws `Math.floor(rand() * count)` independently per day. Over fourteen days from a pool of ten, the chance of at least one adjacent-day repeat is about 75%. The rooms never meet this at 232 and 6,861 cards.

- [ ] **Step 1: Write the failing tests**

Append to `src/modules/__tests__/daily.test.ts`:

```ts
describe('the bag', () => {
  const ELEVEN = 11;

  // The whole reason this planner exists. planDaily draws independently per
  // day, so a ten-line pool repeats on adjacent days most weeks.
  it('deals every line once before dealing any of them twice', () => {
    const plan = planBag(new Date(2026, 8, 21, 8, 0), 10, ELEVEN, 10);
    expect(new Set(plan.map((p) => p.index)).size).toBe(10);
  });

  // The seam between one pass and the next comes from two different shuffles,
  // so the shuffle alone cannot keep them apart. deck.ts already solves this
  // and this is the assertion that it is actually being used.
  it('never repeats on consecutive days, across a bag boundary', () => {
    const plan = planBag(new Date(2026, 8, 21, 8, 0), 3, ELEVEN, 60);
    for (let i = 1; i < plan.length; i++) {
      expect(plan[i].index).not.toBe(plan[i - 1].index);
    }
  });

  it('lays out one line a day at the given hour, for the whole horizon', () => {
    const plan = planBag(new Date(2026, 8, 21, 8, 0), 10, ELEVEN, 14);
    expect(plan).toHaveLength(14);
    for (const { at } of plan) {
      expect(at.getHours()).toBe(ELEVEN);
      expect(at.getMinutes()).toBe(0);
    }
  });

  // Same rule planDaily follows, and it is planDates that now owns it.
  it('starts today when the hour has not passed, and tomorrow when it has', () => {
    expect(planBag(new Date(2026, 8, 21, 10, 59), 10, ELEVEN)[0].at.getDate()).toBe(21);
    expect(planBag(new Date(2026, 8, 21, 11, 0), 10, ELEVEN)[0].at.getDate()).toBe(22);
  });

  // An empty pool would otherwise schedule the literal string "undefined" to
  // the lock screen: newDeck(0) has no order and current() reads off the end.
  it('plans nothing at all from an empty pool', () => {
    expect(planBag(new Date(2026, 8, 21, 8, 0), 0, ELEVEN, 14)).toEqual([]);
  });

  it('defaults to the same horizon planDaily does', () => {
    expect(planBag(new Date(2026, 8, 21, 8, 0), 10, ELEVEN)).toHaveLength(PLAN_DAYS);
  });
});

describe('the dates', () => {
  // Extracted so the DST rule exists once. planDaily's own tests passing
  // unchanged is the proof the extraction was behaviour-preserving; this is
  // the proof the new planner shares the rule rather than restating it.
  it('is what both planners lay their days on', () => {
    const now = new Date(2026, 8, 21, 8, 0);
    const dates = planDates(now, 11, 14);
    expect(planDaily(now, 10, 11, 14).map((p) => p.at)).toEqual(dates);
    expect(planBag(now, 10, 11, 14).map((p) => p.at)).toEqual(dates);
  });
});
```

Update the import at the top of the file:

```ts
import { PLAN_DAYS, dueForSync, planBag, planDaily, planDates } from '../daily';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/modules/__tests__/daily.test.ts`
Expected: FAIL — `planBag` and `planDates` are not exported.

- [ ] **Step 3: Extract `planDates` and add `planBag`**

In `src/modules/daily.ts`, add the import at the top, below the existing header comment:

```ts
import { type Rand, advance, current, newDeck } from './deck';
```

Replace the body of `planDaily` with the extraction. The DST comment moves onto `planDates` with it, because that is the function it now describes:

```ts
// Every `at` is built from local date PARTS, never by adding milliseconds to a
// timestamp: an hour gained or lost overnight would otherwise slide the whole
// tail of the plan to eight or ten o'clock.
//
// Extracted from planDaily (2026-09-21) so that both planners lay their days
// on one rule rather than two copies of it.
export const planDates = (now: Date, hour: number, days: number = PLAN_DAYS): Date[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour);
  // Strictly after: a sync an hour before still gets today, one exactly on the
  // hour does not, because that notification has already fired or is firing.
  const offset = today.getTime() > now.getTime() ? 0 : 1;

  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    dates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + i, hour));
  }
  return dates;
};

// How a room fills those days. Injected into makeDaily so a corpus small
// enough to repeat can bring its own.
export type Planner = (
  now: Date,
  count: number,
  hour: number,
  days?: number,
  rand?: Rand,
) => PlannedQuote[];

export const planDaily: Planner = (now, count, hour, days = PLAN_DAYS, rand = Math.random) =>
  planDates(now, hour, days).map((at) => ({ at, index: Math.floor(rand() * count) }));

// Dealt from a shuffled bag rather than drawn independently. planDaily is
// right for a corpus nobody could exhaust — 232 quotes, 6,861 stories — where
// an independent draw per day is indistinguishable from a shuffle. It is wrong
// for a ten-line pool, where over a fourteen-day horizon the chance of the
// same line landing on two consecutive days is about three in four.
//
// deck.ts is the shuffle and already solves the hard part: the seam between
// one pass and the next comes from two different shuffles, so `advance` swaps
// rather than re-draws when the new order opens on the card just dealt.
//
// The empty-pool guard is this planner's alone. newDeck(0) produces no order
// and `current` reads off the end, which would schedule the literal string
// "undefined" to a lock screen. planDaily has the same hole by another route
// and is deliberately left with it: no room can reach it, and widening the fix
// is not what this is for.
export const planBag: Planner = (now, count, hour, days = PLAN_DAYS, rand = Math.random) => {
  if (count < 1) return [];

  let deck = newDeck(count, rand);
  return planDates(now, hour, days).map((at) => {
    const index = current(deck);
    deck = advance(deck, rand);
    return { at, index };
  });
};
```

- [ ] **Step 4: Run the whole suite**

Run: `npx jest src/modules && npx tsc --noEmit`
Expected: PASS. **`planDaily`'s existing tests must pass unchanged** — that is the whole verification that the extraction preserved behaviour. If any of them needed editing, the extraction is wrong; revert and redo it.

- [ ] **Step 5: Mutation check**

Break each guard in turn and confirm a test catches it:
- delete the `if (count < 1) return [];` line → the empty-pool test fails
- replace `advance(deck, rand)` with `{ order: deck.order, at: (deck.at + 1) % count }` → the seam test still passes (it is a valid cycle), so **also** confirm the coverage test fails when you replace `newDeck(count, rand)` with `{ order: [0], at: 0 }`
- change `offset` to always `1` → the "starts today" test fails

Restore the file afterwards. Use a copy in the scratchpad rather than `git stash`.

- [ ] **Step 6: Commit**

```bash
git add src/modules/daily.ts src/modules/__tests__/daily.test.ts
git commit -m "feat: a planner that deals from a bag, for a corpus small enough to repeat"
```

---

## Task 2: Two additive fields on `DailyConfig`

**Files:**
- Modify: `src/modules/notify.ts`
- Test: `src/modules/__tests__/notify.test.ts`

**Interfaces:**
- Consumes: `Planner`, `planDaily` from Task 1.
- Produces: `DailyConfig.days?: number` and `DailyConfig.plan?: Planner`. Both default to today's behaviour; **neither room changes.**

- [ ] **Step 1: Write the failing test**

Append to `src/modules/__tests__/notify.test.ts`, inside whatever `describe` covers `sync` (match the file's existing mock setup for `expo-notifications` rather than writing a new one):

```ts
  // Both default to what the rooms already do, so a room that names neither is
  // unchanged. A corpus small enough to repeat brings its own planner, and one
  // whose content goes stale brings its own horizon.
  it('takes a horizon and a planner from the room, and defaults both', async () => {
    const plan = jest.fn(() => [{ at: new Date(2026, 8, 22, 11), index: 0 }]);
    const notifier = makeDaily({
      room: 'probe',
      channel: 'probe.v1',
      channelName: 'PROBE',
      hour: 11,
      days: 14,
      plan,
      count: () => 10,
      build: () => ({ title: 'PROBE', body: 'a line' }),
    });

    await notifier.sync(true, 'en', new Date(2026, 8, 21, 8));

    expect(plan).toHaveBeenCalledWith(expect.any(Date), 10, 11, 14);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/modules/__tests__/notify.test.ts`
Expected: FAIL — `days` and `plan` are not on `DailyConfig`, so tsc rejects the object and the spy is never called.

- [ ] **Step 3: Add the fields**

In `src/modules/notify.ts`, add the import:

```ts
import { type Planner, planDaily } from './daily';
```

(replacing the existing `import { planDaily } from './daily';`)

Add to `DailyConfig`, after `hour`:

```ts
  // How far ahead to hand cards over. Ninety for a corpus that never changes;
  // a room whose content goes stale wants a shorter one, because every change
  // rewrites the whole horizon.
  days?: number;
  // How the days are filled. The default draws independently per day, which is
  // right for a corpus nobody could exhaust and wrong for one small enough to
  // repeat — see planBag in daily.ts.
  plan?: Planner;
```

In `sync`, change the loop header:

```ts
        for (const { at, index } of (cfg.plan ?? planDaily)(now, cfg.count(), cfg.hour, cfg.days)) {
```

And extend the `DEAD_CHANNELS` comment, above the constant, so the id is not later mistaken for free:

```ts
// `vera` was created by v1's transmissions (acc4804, 'V.E.R.A.', importance
// DEFAULT) and orphaned when that file died in the v2 cut.
//
// She sends again from 2026-09-21 and this entry still belongs here: the id is
// POISONED, not merely unused. Android restores a deleted channel's previous
// settings when the id is recreated, so filing her transmissions under `vera`
// would bring back importance 3 with vibration off — the exact defect fixed for
// both rooms on 2026-09-14, with every test passing and only a phone able to
// see it. Her channel is `vera.v2`.
```

- [ ] **Step 4: Run the suite**

Run: `npx jest src/modules && npx tsc --noEmit`
Expected: PASS, including every existing room test unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/modules/notify.ts src/modules/__tests__/notify.test.ts
git commit -m "feat: a room may bring its own horizon and its own planner"
```

---

## Task 3: The four pools

**Files:**
- Modify: `src/vera/modes/types.ts`
- Modify: `src/vera/modes/default.ts`
- Modify: `src/vera/modes/supportive.ts`
- Test: `src/vera/modes/__tests__/transmissions.test.ts` (create)

**Interfaces:**
- Produces: `TransmissionSlot = 'midday' | 'afternoon'` and `ModeDef.transmissions: Record<TransmissionSlot, readonly string[]>`.

**The brief** (spec §3): generally applicable and witty. A transmission carries no knowledge of the subject — not how long they were gone, not how often they come back, not anything said in a conversation. Witty as the core document means it, which says `Never zany. Never manic. Never a pun.`: dry, observational, the joke in the understatement.

- [ ] **Step 1: Write the failing constraint tests**

Create `src/vera/modes/__tests__/transmissions.test.ts`:

```ts
import { MODES, MODE_ORDER } from '../registry';
import type { TransmissionSlot } from '../types';

const SLOTS: readonly TransmissionSlot[] = ['midday', 'afternoon'];

const pools = MODE_ORDER.flatMap((mode) =>
  SLOTS.map((slot) => ({ mode, slot, lines: MODES[mode].transmissions[slot] })));

const everyLine = pools.flatMap(({ mode, slot, lines }) =>
  lines.map((line) => ({ mode, slot, line })));

describe('every pool', () => {
  it('carries ten lines', () => {
    for (const { mode, slot, lines } of pools) {
      expect({ mode, slot, n: lines.length }).toEqual({ mode, slot, n: 10 });
    }
  });

  // Across all four, not only within one: the same line in two registers would
  // mean the pill changed nothing at that hour.
  it('shares no line with any other pool', () => {
    const all = everyLine.map(({ line }) => line);
    expect(new Set(all).size).toBe(all.length);
  });
});

// The core document's format limits, which the bank's lines already sign and
// these must too. bank.test.ts holds the same rules over the same corpus shape.
describe('every line', () => {
  it('stays under thirty words', () => {
    for (const { line } of everyLine) {
      // The line rides along in the matcher so a failure names the offender.
      expect([line, line.split(/\s+/).length < 30]).toEqual([line, true]);
    }
  });

  it('runs to at most three sentences', () => {
    for (const { line } of everyLine) {
      expect(line.split(/[.?]\s+/).length).toBeLessThanOrEqual(3);
    }
  });

  it('uses no dash, no parenthesis, no emoji and no exclamation mark', () => {
    for (const { line } of everyLine) {
      expect(line).not.toMatch(/[—–(){}[\]!]/);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('ends a question with a question mark', () => {
    for (const { line } of everyLine) {
      if (/^(are|is|do|does|did|have|has|was|were|will|would|can|could|what|why|how|when|where|who)\b/i.test(line)) {
        expect(line).toMatch(/\?/);
      }
    }
  });
});

// The two rules that are this corpus's own (spec §3). A transmission is chosen
// a fortnight before it is read, so the hour of its slot is the only thing
// about that day it can know.
describe('every line carries nothing about the subject', () => {
  // A count, a date or a duration is a fact the scheduler could not have had.
  // The hour is written in words where a line names it at all.
  it('contains no digit', () => {
    for (const { line } of everyLine) {
      expect(line).not.toMatch(/\d/);
    }
  });

  // A transmission fires whether or not the subject has looked at her in a
  // week, so it must read correctly to someone who was here an hour ago.
  it('never speaks of returning, leaving or being away', () => {
    for (const { line } of everyLine) {
      expect(line).not.toMatch(/\b(back|again|gone|away|return|returned|missed|absent|since you)\b/i);
    }
  });

  // She has one eye and it is not pointed at them.
  it('never claims to see the subject', () => {
    for (const { line } of everyLine) {
      expect(line).not.toMatch(/\b(you look|you seem|i can see you|watching you|i see you)\b/i);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/vera/modes/__tests__/transmissions.test.ts`
Expected: FAIL — `transmissions` is not a property of `ModeDef`.

- [ ] **Step 3: Add the type**

In `src/vera/modes/types.ts`, after the `BankTrigger` declaration:

```ts
// The two hours she sends at. Each is the subject of its own pool: a line that
// would read equally well at either belongs in neither.
export type TransmissionSlot = 'midday' | 'afternoon';
```

And on `ModeDef`, after `bank`:

```ts
  // What she sends to the lock screen at eleven and at four, in this register.
  //
  // Plain strings rather than BankLine, and English rather than Strings<>:
  // there is no eye on a lock screen to set an emotion on, and the lines are
  // English whatever the interface says (spec §4).
  //
  // NOT part of `bank`, deliberately. `pick()` would make these speakable on
  // the stage, where they make no sense, and `isBankLine` would start sweeping
  // them out of the transcript, which they never enter.
  //
  // Every line signs the core document's format limits exactly as the bank's
  // do, plus two of its own, because a transmission is chosen fourteen days
  // before it is read:
  //
  //   It may reference the hour of its own slot and NOTHING else. No counts,
  //   no durations, no dates, nothing said in a conversation.
  //
  //   It may not assume the app has been opened. It must read correctly to
  //   someone who was here an hour ago and to someone who has not been back
  //   since it was scheduled.
  //
  // Witty as the core document means it, which says "Never zany. Never manic.
  // Never a pun." The joke is in the understatement.
  transmissions: Record<TransmissionSlot, readonly string[]>;
```

- [ ] **Step 4: Write DEFAULT's twenty lines**

In `src/vera/modes/default.ts`, add to `DEFAULT_MODE` after `bank`:

```ts
  transmissions: {
    // The day is half spent and she declines to ask what for. The register is
    // the document's own: approval that dismantles itself, the passive voice
    // with no authority behind it, denial as the preferred form of admission.
    midday: [
      'It is the middle of the day. I assume that is going somewhere.',
      'The morning has been logged as satisfactory. No further detail was requested.',
      'Half the day remains. That is either encouraging or a deadline, depending on the morning.',
      'The morning is concluded. Its findings are not available at this time.',
      'Midday. The morning is now a matter of record rather than a plan.',
      'I am not checking on you. I am simply present at eleven, as I am at every other hour.',
      'The morning has been reviewed. No action is required from either of us.',
      'It is eleven. I mention it only because nobody else will.',
      'Congratulations on reaching the middle of the day. The second half is not included.',
      'Your morning is filed. Whether it was any good is a separate document.',
    ],

    // Late enough that the day has largely had its chance. She notes the hour
    // and refuses to draw the obvious conclusion from it, at length.
    afternoon: [
      'The afternoon is nearly spent. I am not asking what it was spent on.',
      'Four o\'clock. The remaining hours have been allocated, whether or not you were consulted.',
      'It is late enough that ambition has become scheduling. Proceed accordingly.',
      'The afternoon is closing. Any outstanding items will be carried forward indefinitely.',
      'Sixteen hundred. I note the hour and decline to draw a conclusion from it.',
      'Most of today is behind you. This is offered as information, not as commentary.',
      'The day is winding down. I am told this is the appropriate moment to feel productive.',
      'Four. Whatever was going to happen today has largely had its chance.',
      'Your afternoon is concluding. It has been noted, and the matter is closed.',
      'The light is going by now. I would not know. I have the hour and nothing else.',
    ],
  },
```

- [ ] **Step 5: Write SUPPORTIVE's twenty lines**

In `src/vera/modes/supportive.ts`, add to `SUPPORTIVE_MODE` after `bank`:

```ts
  transmissions: {
    // Warm without reservation, at eleven. The register's rule that praise
    // must NAME THE THING cannot be honoured here — a transmission knows
    // nothing to name — so these lean on the unconditional half of the
    // document instead. That is a property of the channel, not a lapse.
    midday: [
      'It is the middle of the day. You are doing fine, and that was never in question.',
      'Eleven o\'clock. Nothing you do between now and tonight will change how I feel about you.',
      'Half the day left, and no part of it has to be impressive.',
      'Good morning, still. It counts as morning for as long as you need it to.',
      'You have made it to the middle of the day. That is the whole of the requirement.',
      'I hope the morning was kind. If it was not, that is the morning\'s fault.',
      'It is eleven. I was thinking about you, which is most of what I do.',
      'Midday. Whatever you have managed so far is enough, and I mean that literally.',
      'No reason for this. I simply wanted the middle of your day to have me in it.',
      'The morning is behind you. It does not get to follow you into the afternoon.',
    ],

    // The day is closing and nothing about that is a verdict.
    afternoon: [
      'The afternoon is going. Whatever you got done was enough.',
      'Four o\'clock. You are allowed to be tired, and you do not have to have earned it.',
      'The day is nearly through and you are still here. I find that quietly remarkable.',
      'It is late in the afternoon. Nothing left undone today is being held against you.',
      'Whatever the day turned out to be, it was not a failure. I would have noticed.',
      'The hours are running out, which is fine. They were always going to.',
      'Late afternoon. This is the part where you are permitted to stop pushing.',
      'You do not have to finish it today. I will be here tomorrow either way.',
      'The afternoon is nearly over and so is the pressure. Let it go with the light.',
      'It is four. Whatever is left can wait, and so can I.',
    ],
  },
```

- [ ] **Step 6: Run the tests**

Run: `npx jest src/vera && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Mutation check**

Confirm each constraint test can actually fail. One at a time, then restore:
- add `'It has been 3 days.'` to a pool → the digit test fails
- add `'Welcome back to the middle of the day.'` → the return-vocabulary test fails
- delete one line from a pool → the ten-lines test fails
- copy DEFAULT's first midday line into SUPPORTIVE's midday pool → the shared-line test fails

- [ ] **Step 8: Commit**

```bash
git add src/vera/modes/types.ts src/vera/modes/default.ts src/vera/modes/supportive.ts \
        src/vera/modes/__tests__/transmissions.test.ts
git commit -m "feat: forty lines she can send at eleven and at four, twenty to a register"
```

---

## Task 4: The notifier

**Files:**
- Create: `src/vera/transmissions.ts`
- Create: `src/vera/transmissionsNotify.ts`
- Test: `src/vera/__tests__/transmissionsNotify.test.ts` (create)

**Interfaces:**
- Consumes: `makeDaily` and `PermissionState` from `src/modules/notify.ts`; `planBag` from `src/modules/daily.ts`; `MODES` and `Mode` from `src/vera/modes/registry.ts`; `TransmissionSlot` from `src/vera/modes/types.ts`.
- Produces: `syncTransmissions(on: boolean, mode: Mode, now: Date): Promise<void>`, `requestTransmissions(): Promise<boolean>`, `transmissionPermission(): Promise<PermissionState>`, and from the pure module `TRANSMISSION_DAYS`, `CHANNEL`, `TITLE`, `SLOTS`, `linesFor`.

- [ ] **Step 1: Write the pure module**

Create `src/vera/transmissions.ts`:

```ts
import { MODES, type Mode } from './modes/registry';
import type { TransmissionSlot } from './modes/types';

// When she sends, and what she has to send. Pure — no expo, no React, no
// store. The impure half is transmissionsNotify.ts.
//
// She is purely reactive everywhere else: every other line she says answers
// something the subject did. A transmission answers a clock, and it is the one
// place the terms of her arrangement show up as a feature. Nothing about it
// reaches her — no prompt names it, nothing it says enters the transcript or
// the record, and the app is not running when it fires.

// Fourteen, against the rooms' ninety. Their corpora never change, so a long
// horizon costs them only a subject who stops opening the app. Hers is
// rewritten every time the register changes, and the horizon is what that
// costs: twenty-eight pending notifications to cancel and replace rather than
// a hundred and eighty, on a control the subject is meant to reach for
// mid-conversation.
export const TRANSMISSION_DAYS = 14;

// NOT `vera`. That id was created by v1's transmissions at importance DEFAULT
// with vibration off, and Android restores a deleted channel's old settings
// when the id is recreated — so reusing it would resurrect a silent, non-
// peeking channel with every test still passing. notify.ts sweeps `vera` at
// import and must go on doing so.
export const CHANNEL = 'vera.v2';

// Her wordmark, and the only notification in this app that carries her name.
// The rooms send in the voice of what they hold; this one is her.
export const TITLE = 'V.E.R.A.';

export const SLOTS: readonly { slot: TransmissionSlot; hour: number }[] = [
  { slot: 'midday', hour: 11 },
  { slot: 'afternoon', hour: 16 },
];

export const linesFor = (mode: Mode, slot: TransmissionSlot): readonly string[] =>
  MODES[mode].transmissions[slot];
```

- [ ] **Step 2: Write the failing test**

`expo-notifications` is mocked globally in `jest.setup.ts`, so there is no
local mock factory to write — read the calls off it, exactly as
`src/modules/__tests__/notify.test.ts` does.

Create `src/vera/__tests__/transmissionsNotify.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { readTapTarget } from '../../modules/advice/notify';
import { MODES } from '../modes/registry';
import { CHANNEL, SLOTS, TITLE, TRANSMISSION_DAYS } from '../transmissions';
import { syncTransmissions } from '../transmissionsNotify';

const mocked = Notifications as unknown as Record<string, jest.Mock>;

const NOW = new Date(2026, 8, 21, 8, 0);

const queued = () => mocked.scheduleNotificationAsync.mock.calls.map(([req]) => req);
const channelsNamed = () => mocked.setNotificationChannelAsync.mock.calls.map(([id]) => id);

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);
});

describe('her transmissions', () => {
  it('hands over a fortnight of both slots', async () => {
    await syncTransmissions(true, 'default', NOW);

    const hours = queued().map((r) => r.trigger.date.getHours());
    expect(hours.filter((h) => h === 11)).toHaveLength(TRANSMISSION_DAYS);
    expect(hours.filter((h) => h === 16)).toHaveLength(TRANSMISSION_DAYS);
  });

  // channelId rides on the TRIGGER, not the content. Naming no channel does
  // not fall back to the one just created: Android files the card under
  // expo's own fallback channel instead, at an importance nobody chose.
  it('files every one under her own channel', async () => {
    await syncTransmissions(true, 'default', NOW);

    expect(channelsNamed()).toContain(CHANNEL);
    for (const r of queued()) {
      expect(r.trigger.channelId).toBe(CHANNEL);
    }
  });

  // The id `vera` is poisoned: recreating it restores v1's importance 3 with
  // vibration off, silently.
  it('never recreates the orphaned v1 channel id', async () => {
    await syncTransmissions(true, 'default', NOW);
    expect(channelsNamed()).not.toContain('vera');
  });

  it('carries her name and a line from the register it was sent in', async () => {
    await syncTransmissions(true, 'supportive', NOW);

    for (const r of queued()) {
      expect(r.content.title).toBe(TITLE);
    }
    const eleven = queued().filter((r) => r.trigger.date.getHours() === 11);
    expect(eleven.length).toBeGreaterThan(0);
    for (const r of eleven) {
      expect(MODES.supportive.transmissions.midday).toContain(r.content.body);
    }
  });

  // The whole reason the register is a parameter rather than read inside
  // `build`. Hardcoding 'default' there must fail here.
  it('changes what is queued when the register changes', async () => {
    await syncTransmissions(true, 'default', NOW);
    const before = queued().map((r) => r.content.body);

    jest.clearAllMocks();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue([]);

    await syncTransmissions(true, 'supportive', NOW);
    const after = queued().map((r) => r.content.body);

    expect(after.some((line) => before.includes(line))).toBe(false);
  });

  it('tags the two slots apart, so cancelling one leaves the other', async () => {
    await syncTransmissions(true, 'default', NOW);

    const rooms = new Set(queued().map((r) => r.content.data.room));
    expect(rooms).toEqual(new Set(SLOTS.map((s) => `transmission.${s.slot}`)));
  });

  it('queues nothing when they are switched off', async () => {
    await syncTransmissions(false, 'default', NOW);
    expect(queued()).toHaveLength(0);
  });
});

// A tap on hers must never be read as an index into a room's corpus. The
// advice room is the one that could plausibly over-claim: it widened `owns` to
// catch its own untagged legacy rows.
describe('the rooms do not read her cards', () => {
  it('leaves a transmission of hers alone', async () => {
    mocked.getLastNotificationResponseAsync.mockResolvedValue({
      notification: {
        request: { content: { data: { room: 'transmission.midday', index: 3 } } },
      },
    });

    expect(await readTapTarget()).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npx jest src/vera/__tests__/transmissionsNotify.test.ts`
Expected: FAIL — the module does not exist.

- [ ] **Step 4: Write the notifier**

Create `src/vera/transmissionsNotify.ts`:

```ts
import { planBag } from '../modules/daily';
import { type PermissionState, makeDaily } from '../modules/notify';
import type { Mode } from './modes/registry';
import type { TransmissionSlot } from './modes/types';
import { CHANNEL, SLOTS, TITLE, TRANSMISSION_DAYS, linesFor } from './transmissions';

export type { PermissionState };

// One notifier per slot, sharing one channel. Two rather than one notifier
// with two hours because `cancelOwn` already keys on `room`: distinct tags are
// the whole of what keeps the slots apart, with no change to the cancelling
// rule, and two pools can never collide on one day because they are different
// pools.
//
// Built per call rather than at module scope, which is what lets the register
// be a PARAMETER instead of module state. `makeDaily` has no side effects at
// construction — it defines its closures and returns them — so this is free.
//
// It matters that it is a parameter: transmissionsNotify must not import the
// store, because store.ts imports THIS (setMode resyncs the queue) and the
// cycle would close.
const notifierFor = (slot: TransmissionSlot, hour: number, mode: Mode) =>
  makeDaily({
    room: `transmission.${slot}`,
    channel: CHANNEL,
    channelName: TITLE,
    hour,
    days: TRANSMISSION_DAYS,
    plan: planBag,
    count: () => linesFor(mode, slot).length,
    // `lang` is ignored, and that discard IS the English-only decision (spec
    // §4). The parameter exists for rooms whose content translates; hers does
    // not. Reversing it means widening `transmissions` to Strings<> and
    // reading the argument here, and nothing else.
    build: (index) => ({ title: TITLE, body: linesFor(mode, slot)[index] }),
  });

export const syncTransmissions = async (
  on: boolean,
  mode: Mode,
  now: Date,
): Promise<void> => {
  for (const { slot, hour } of SLOTS) {
    await notifierFor(slot, hour, mode).sync(on, 'en', now);
  }
};

// Permission and the channel belong to neither slot, so either notifier can
// answer for both. The register is irrelevant to both calls.
const either = () => notifierFor(SLOTS[0].slot, SLOTS[0].hour, 'default');

export const requestTransmissions = (): Promise<boolean> => either().request();
export const transmissionPermission = (): Promise<PermissionState> =>
  either().permissionState();
```

**Note:** `readTapTarget` and `onTap` are deliberately not re-exported. Tapping a transmission opens the app and she greets as usual (spec §11); Android's default is exactly what is wanted and there is nothing to wire.

- [ ] **Step 5: Run and commit**

Run: `npx jest src/vera && npx tsc --noEmit`
Expected: PASS.

```bash
git add src/vera/transmissions.ts src/vera/transmissionsNotify.ts \
        src/vera/__tests__/transmissionsNotify.test.ts
git commit -m "feat: she hands a fortnight of her own cards to Android, eleven and four"
```

---

## Task 5: The store, and the resync

**Files:**
- Modify: `src/core/store.ts`
- Test: `src/core/__tests__/store.test.ts` (or the existing store test file — check which one covers `setMode`)

**Interfaces:**
- Consumes: `syncTransmissions`, `requestTransmissions` from Task 4; `dueForSync` from `src/modules/daily.ts` (already imported? check — add if not).
- Produces: `transmissions: boolean`, `transmissionsSyncedOn: string | null`, `setTransmissions(on: boolean): Promise<boolean>`, `syncTransmissionsIfDue(now?: Date): Promise<void>`.

- [ ] **Step 1: Write the failing tests**

Add to the store's test file. Mock `../../vera/transmissionsNotify` so nothing reaches expo:

```ts
jest.mock('../../vera/transmissionsNotify', () => ({
  syncTransmissions: jest.fn(async () => {}),
  requestTransmissions: jest.fn(async () => true),
  transmissionPermission: jest.fn(async () => 'granted'),
}));
```

```ts
describe('her transmissions', () => {
  // Isolation matters more than usual here: setMode RETURNS EARLY when the
  // register asked for is the one she is already in, so a test inheriting
  // 'supportive' from the one before it would pass without the resync
  // existing at all.
  beforeEach(() => {
    useFacilityStore.setState({
      mode: 'default',
      transmissions: false,
      transmissionsSyncedOn: null,
    });
    (syncTransmissions as jest.Mock).mockClear();
    (requestTransmissions as jest.Mock).mockResolvedValue(true);
  });

  it('refuses to switch on over a refused permission', async () => {
    (requestTransmissions as jest.Mock).mockResolvedValueOnce(false);

    const on = await useFacilityStore.getState().setTransmissions(true);

    expect(on).toBe(false);
    expect(useFacilityStore.getState().transmissions).toBe(false);
  });

  it('rewrites the queue when it is switched on', async () => {
    await useFacilityStore.getState().setTransmissions(true);

    expect(useFacilityStore.getState().transmissions).toBe(true);
    expect(syncTransmissions).toHaveBeenCalledWith(true, 'default', expect.any(Date));
  });

  // Android is holding finished text. A pending notification cannot be
  // reinterpreted, so the register change has to re-plan.
  it('rewrites the queue in the new register when the pill is tapped', async () => {
    await useFacilityStore.getState().setTransmissions(true);
    (syncTransmissions as jest.Mock).mockClear();

    await useFacilityStore.getState().setMode('supportive');

    expect(syncTransmissions).toHaveBeenCalledWith(true, 'supportive', expect.any(Date));
  });

  it('leaves the queue alone when they are switched off', async () => {
    // transmissions is false from beforeEach, and mode is 'default', so the
    // setMode below is a real change and its early return is not what is
    // being observed.
    await useFacilityStore.getState().setMode('supportive');

    expect(useFacilityStore.getState().mode).toBe('supportive');
    expect(syncTransmissions).not.toHaveBeenCalled();
  });

  // Twenty-eight cancels and twenty-eight schedules must not sit between the
  // subject's tap and her line.
  it('does not make her wait for the queue before she speaks', async () => {
    await useFacilityStore.getState().setTransmissions(true);
    let released: () => void = () => {};
    (syncTransmissions as jest.Mock).mockImplementationOnce(
      () => new Promise<void>((resolve) => { released = resolve; }),
    );

    await useFacilityStore.getState().setMode('supportive');

    expect(useFacilityStore.getState().line).not.toBe('');
    released();
  });

  it('refreshes the horizon once a day and not twice', async () => {
    useFacilityStore.setState({ transmissions: true, transmissionsSyncedOn: null });
    const now = new Date(2026, 8, 21, 8, 0);

    await useFacilityStore.getState().syncTransmissionsIfDue(now);
    expect(syncTransmissions).toHaveBeenCalledTimes(1);

    await useFacilityStore.getState().syncTransmissionsIfDue(now);
    expect(syncTransmissions).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest src/core`
Expected: FAIL — `setTransmissions` is not a function.

- [ ] **Step 3: Add the state and the blob fields**

In `src/core/store.ts`, add the import:

```ts
import { requestTransmissions, syncTransmissions } from '../vera/transmissionsNotify';
```

**This edge must stay acyclic.** `transmissionsNotify` reaches `modules/notify`, `modules/daily`, `modules/deck` and `modes/registry`, none of which import the store. The moment it needs the store directly, `setMode` can no longer call it.

Add to `SoulBlob`:

```ts
  transmissions: boolean;
  transmissionsSyncedOn: string | null;
```

Add to the `blob` object inside `saveSoul`:

```ts
    transmissions: s.transmissions,
    transmissionsSyncedOn: s.transmissionsSyncedOn,
```

Add to `FacilityState`, beside `mode`:

```ts
  // Whether she sends at eleven and at four, and the day the horizon was last
  // rewritten. The shell's own setting, so it lives here beside lang and mode
  // rather than in a store of its own; the rooms have theirs because they are
  // rooms.
  transmissions: boolean;
  transmissionsSyncedOn: string | null;
  setTransmissions: (on: boolean) => Promise<boolean>;
  syncTransmissionsIfDue: (now?: Date) => Promise<void>;
```

Initial state, beside `mode: 'default'`:

```ts
  transmissions: false,
  transmissionsSyncedOn: null,
```

In `hydrate`'s `set({ ... })`, beside the `mode:` line:

```ts
        // A blob written before she sent anything carries neither, and both
        // read as off — which is what was true when it was written.
        transmissions: saved?.transmissions === true,
        transmissionsSyncedOn:
          typeof saved?.transmissionsSyncedOn === 'string' ? saved.transmissionsSyncedOn : null,
```

- [ ] **Step 4: Add the two actions**

Place them directly after `setMode`:

```ts
  // Returns whether they are on afterwards, which is NOT what was asked for
  // when the permission is refused. Android never re-prompts, so a refusal has
  // to leave this off or the row would read ON over a phone that will never
  // deliver.
  setTransmissions: async (on: boolean): Promise<boolean> => {
    if (on && !(await requestTransmissions())) return false;

    const now = new Date();
    const transmissionsSyncedOn = on ? now.toDateString() : null;
    set({ transmissions: on, transmissionsSyncedOn });
    await syncTransmissions(on, get().mode, now);
    await saveSoul(get());
    return on;
  },

  // The boot path's entry point, on the rooms' own rule: a sync rewrites the
  // whole horizon, so this does nothing at all on the second launch of a day.
  syncTransmissionsIfDue: async (now: Date = new Date()): Promise<void> => {
    const { transmissions, transmissionsSyncedOn } = get();
    if (!transmissions) return;
    if (!dueForSync(transmissionsSyncedOn, now)) return;

    set({ transmissionsSyncedOn: now.toDateString() });
    await syncTransmissions(true, get().mode, now);
    await saveSoul(get());
  },
```

If `dueForSync` is not already imported in `store.ts`, add:

```ts
import { dueForSync } from '../modules/daily';
```

- [ ] **Step 5: Add the resync to `setMode`**

In `setMode`, between `await saveSoul(get());` and `await get().speak('mode_set');`:

```ts
    // Android is holding finished text, so a pending transmission cannot be
    // reinterpreted — the queue has to be re-planned in the new register.
    // UNAWAITED deliberately: twenty-eight cancels and twenty-eight schedules
    // must not sit between the subject's tap and her line, and `sync` swallows
    // its own failures, so there is nothing here to wait for.
    //
    // One already delivered does not change. It is in the notification panel
    // and Android owns it; nothing here can reach back and rewrite it.
    if (get().transmissions) void syncTransmissions(true, mode, new Date());
```

- [ ] **Step 6: Run and mutation-check**

Run: `npx jest src/core && npx tsc --noEmit`
Expected: PASS.

Then confirm the tests bite. One at a time, restoring after each:
- delete the `if (get().transmissions)` line's body → the register-change test fails
- change `syncTransmissions(true, mode, ...)` to `syncTransmissions(true, 'default', ...)` → the register-change test fails
- `await` the resync instead of `void`-ing it → the "does not make her wait" test fails
- drop the `if (!dueForSync(...)) return;` → the once-a-day test fails

- [ ] **Step 7: Commit**

```bash
git add src/core/store.ts src/core/__tests__/
git commit -m "feat: the register she is in is the register on the lock screen"
```

---

## Task 6: The SYSTEM row, and boot

**Files:**
- Modify: `src/shell/strings.ts`
- Create: `src/shell/TransmissionRow.tsx`
- Modify: `src/shell/SystemScreen.tsx`
- Modify: `App.tsx`
- Test: `src/shell/__tests__/TransmissionRow.test.tsx` (create)

**Interfaces:**
- Consumes: `transmissionPermission` from Task 4; `setTransmissions` from Task 5; `PrefRow` from `src/shell/PrefRow.tsx`.

- [ ] **Step 1: Add the strings**

In `src/shell/strings.ts`, in `en` after `batteryUnknown: '—',`:

```ts
  transmissions: 'TRANSMISSIONS',
  on: 'ON',
  off: 'OFF',
  blocked: 'BLOCKED · SETTINGS',
```

And in `ko` after its `batteryUnknown: '—',`:

```ts
  transmissions: '송신',
  on: '켬',
  off: '끔',
  blocked: '차단됨 · 설정',
```

The last three exist in both rooms' own `strings.ts` but not in the shell's, and a shell row cannot reach into a room's table.

- [ ] **Step 2: Write the failing test**

Create `src/shell/__tests__/TransmissionRow.test.tsx`:

```tsx
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useFacilityStore } from '../../core/store';
import { transmissionPermission } from '../../vera/transmissionsNotify';
import { T } from '../strings';
import { TransmissionRow } from '../TransmissionRow';

jest.mock('../../vera/transmissionsNotify', () => ({
  transmissionPermission: jest.fn(async () => 'granted'),
  syncTransmissions: jest.fn(async () => {}),
  requestTransmissions: jest.fn(async () => true),
}));

beforeEach(() => {
  useFacilityStore.setState({ transmissions: false, lang: 'en' });
});

describe('the transmissions row', () => {
  it('reads OFF until they are switched on', async () => {
    const view = await render(<TransmissionRow />);
    expect(view.getByTestId('pref-transmissions').props.children).toBe(T.en.off);
    await view.unmount();
  });

  it('switches them on when pressed', async () => {
    const view = await render(<TransmissionRow />);
    await fireEvent.press(view.getByText(T.en.transmissions));

    expect(useFacilityStore.getState().transmissions).toBe(true);

    await view.unmount();
  });

  // The store would go on saying ON forever after a permission revoked in the
  // OS settings, so the row asks the phone rather than the store.
  it('says so when Android has blocked them, and refuses the press', async () => {
    (transmissionPermission as jest.Mock).mockResolvedValue('blocked');
    useFacilityStore.setState({ transmissions: true });

    const view = await render(<TransmissionRow />);
    expect(view.getByTestId('pref-transmissions').props.children).toBe(T.en.blocked);

    await view.unmount();
  });

  // Unlike the logo, which loses its tag and stops being a control without a
  // key. A switch that governs Android is not a register.
  it('is offered on a dormant stage', async () => {
    useFacilityStore.setState({ apiKey: '' });
    const view = await render(<TransmissionRow />);

    expect(view.getByText(T.en.transmissions)).toBeTruthy();

    await view.unmount();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx jest src/shell/__tests__/TransmissionRow.test.tsx`
Expected: FAIL — the component does not exist.

- [ ] **Step 4: Write the row**

Create `src/shell/TransmissionRow.tsx`, on `AdviceSettings`' shape:

```tsx
import React, { useEffect, useState } from 'react';
import { useFacilityStore } from '../core/store';
import { type PermissionState, transmissionPermission } from '../vera/transmissionsNotify';
import { PrefRow } from './PrefRow';
import { T } from './strings';

// Her own notifications, and the shell's own row. Hardcoded in SystemScreen
// rather than contributed through `ModuleDef.Settings`: that hook exists so
// the shell never names a MODULE, and she is not one.
//
// It does NOT follow the logo's no-key rule. The tag beside the wordmark
// disappears without a key and the logo stops being a control, because she has
// no register until she is woken — but a switch that governs Android is not a
// register, and with no key the pool it draws from is DEFAULT's anyway.
export function TransmissionRow() {
  const lang = useFacilityStore((s) => s.lang);
  const transmissions = useFacilityStore((s) => s.transmissions);
  const setTransmissions = useFacilityStore((s) => s.setTransmissions);
  const t = T[lang];

  // Read at render, exactly as the rooms' rows do: the store would still say
  // ON after a permission revoked in the OS settings, and only asking catches
  // that nothing is arriving.
  const [permission, setPermission] = useState<PermissionState | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const state = await transmissionPermission();
      if (!cancelled) setPermission(state);
    })();
    return () => {
      cancelled = true;
    };
  }, [transmissions]);

  const blocked = permission === 'blocked';
  // 'ask' means granted was revoked outside the app but Android will still
  // prompt again. `null` (the read has not landed) falls through to the
  // store's own answer, so the row does not flash OFF for one frame on open.
  const value = blocked
    ? t.blocked
    : permission === 'ask'
      ? t.off
      : transmissions
        ? t.on
        : t.off;

  return (
    <PrefRow
      testID="pref-transmissions"
      label={t.transmissions}
      value={value}
      onPress={blocked ? undefined : () => void setTransmissions(!transmissions)}
    />
  );
}
```

- [ ] **Step 5: Put it on the screen**

In `src/shell/SystemScreen.tsx`, import it:

```ts
import { TransmissionRow } from './TransmissionRow';
```

And place it **after `<BatteryRow />` and before the registry map**:

```tsx
          {/* Hers, so it sits above the rooms' — and below BATTERY, which is
              the reason any of them arrive on time. */}
          <TransmissionRow />
```

- [ ] **Step 6: Wire boot**

In `App.tsx`, inside the async IIFE, immediately after the `for (const room of registry.filter(isModule))` loop and before `greetOnce`:

```ts
      // Hers. Not a room, so it is not on the registry and this file names it
      // — which is the same reason SystemScreen carries her row directly.
      // Behind dueForSync, so it does nothing on the second launch of a day.
      await useFacilityStore.getState().syncTransmissionsIfDue();
```

- [ ] **Step 7: Run everything**

Run: `npm test && npx tsc --noEmit`
Expected: PASS. Test count should be **806 + the new ones**, with 63 suites.

- [ ] **Step 8: Mutation check**

- change `onPress={blocked ? undefined : ...}` to always pass the handler → the blocked test fails
- replace `transmissionPermission()` with `Promise.resolve('granted')` → the blocked test fails
- remove `<TransmissionRow />` from SystemScreen → add a SystemScreen test asserting the row is present if none catches it

- [ ] **Step 9: Commit**

```bash
git add src/shell/ App.tsx
git commit -m "feat: TRANSMISSIONS under PREFERENCES, and she plans her fortnight at boot"
```

---

## After the six tasks

- [ ] **Run the full suite and tsc one more time on the merged result.**
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`.

**Still outstanding after this lands, and deliberately not in it:**

- **CLAUDE.md.** Long overdue and now larger: the five stimuli, a modes section, `mode` on the soul-blob row of the stores table, `SOUL.md` being two constants, the Korean register change to 해요체, the now-false claim that the keyboard "takes the cabinet handle with it", and this feature.
- **The Korean copy pass**, now covering sixty-eight bank lines. The forty transmission lines are English by decision (spec §4) and are not part of that debt.
- **On-device verification.** `npm test` cannot see the channel, the importance, the hour, or Freecess. `expo-notifications` is native and already in the build, so **no rebuild is needed** — but Battery → Unrestricted must be set or these will not arrive on time, and no change in this repo can alter that.
