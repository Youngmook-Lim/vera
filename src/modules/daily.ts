// When a card is sent and which one, decided here and nowhere else. Pure — no
// expo, no React, no store. The impure half is notify.ts.
//
// Shared by every room that sends one a day (2026-09-07). The HOUR is the
// caller's — the advice room sends at nine and the horror room at ten at
// night — and it used to be a constant here, back when one room was the only
// room that sent anything.

import { type Rand, newDeck } from './deck';

// Ninety days of cards handed over at once. There is no documented Android
// ceiling on pending notifications (the 64 limit is iOS, and this app is
// Android-only), so this stays well clear of an untested one rather than
// reaching for it. Three months without opening the app means the feature has
// already failed at its job.
export const PLAN_DAYS = 90;

export interface PlannedQuote {
  at: Date;
  index: number;
}

// Every `at` is built from local date PARTS, never by adding milliseconds to a
// timestamp: an hour gained or lost overnight would otherwise slide the whole
// tail of the plan to eight or ten o'clock.
//
// Extracted from planDaily (2026-09-21) so both planners lay their days on one
// rule rather than two copies of it.
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

// mulberry32. Math.random cannot be seeded, and being seeded is the whole point
// of the planner below.
const seeded = (seed: number): Rand => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Days since the epoch, from LOCAL date parts, so the number turns over at
// local midnight and never at an hour DST happens to move.
const dayNumber = (at: Date): number =>
  Math.floor(Date.UTC(at.getFullYear(), at.getMonth(), at.getDate()) / 86400000);

const rawOrder = (pass: number, count: number): number[] => newDeck(count, seeded(pass)).order;

// One pass of the corpus, in an order fixed by which pass it is. The seam swaps
// position 0 with position ONE, never with the last: swapping the last would
// change what the NEXT pass has to avoid, and that pass's answer would then
// depend on its own predecessor, all the way down. Swapping inward keeps the
// lookback exactly one deep. A two-line corpus cannot be kept apart at a seam
// by any swap and is left alone.
const passOrder = (pass: number, count: number): number[] => {
  const order = rawOrder(pass, count);
  if (count > 2 && pass > 0 && order[0] === rawOrder(pass - 1, count)[count - 1]) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
};

// Dealt from a bag whose order is a pure function of the DATE, so every sync
// computes the same line for the same day.
//
// That property is the whole feature, and its absence is what made the first
// version of this pointless. A sync rewrites the entire horizon and one fires
// every morning, so under a fresh shuffle per sync only the first entry of any
// plan ever fired — an independent draw, indistinguishable from planDaily.
// Seeded by the date, re-planning is idempotent, and "every line before any
// line twice" holds across the life of the app rather than inside a plan
// nobody sees the end of.
//
// `rand` is not taken: this planner has no use for one, and Planner's is
// optional, so a four-parameter function satisfies it.
//
// The empty-pool guard is this planner's alone. `newDeck(0)` produces no order
// and the index read would be `undefined`, which schedules the literal string
// "undefined" to a lock screen. planDaily has the same hole by another route
// and is deliberately left with it: no room can reach it.
export const planBag: Planner = (now, count, hour, days = PLAN_DAYS) => {
  if (count < 1) return [];

  return planDates(now, hour, days).map((at) => {
    const day = dayNumber(at);
    const pass = Math.floor(day / count);
    return { at, index: passOrder(pass, count)[day - pass * count] };
  });
};

// A sync rewrites the whole horizon, so doing it on every launch would be
// ninety cancels and ninety native calls in the boot path for an
// identically-shaped result. The stamp is a toDateString(), the same shape and
// the same comparison the soul store's `day` uses, so neither has to reason
// about timezones.
export const dueForSync = (syncedOn: string | null, now: Date): boolean =>
  syncedOn !== now.toDateString();
