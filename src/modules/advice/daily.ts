// When a card is sent and which one, decided here and nowhere else. Pure — no
// expo, no React, no store. The impure half is notify.ts.
export const NOTIFY_HOUR = 9;

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
export const planDaily = (
  now: Date,
  count: number,
  days: number = PLAN_DAYS,
  rand: () => number = Math.random,
): PlannedQuote[] => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), NOTIFY_HOUR);
  // Strictly after: a sync at 08:59 still gets this morning, one at 09:00 does
  // not, because that notification has already fired or is firing.
  const offset = today.getTime() > now.getTime() ? 0 : 1;

  const plan: PlannedQuote[] = [];
  for (let i = 0; i < days; i++) {
    plan.push({
      at: new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset + i, NOTIFY_HOUR),
      index: Math.floor(rand() * count),
    });
  }
  return plan;
};

// A sync rewrites the whole horizon, so doing it on every launch would be
// ninety cancels and ninety native calls in the boot path for an
// identically-shaped result. The stamp is a toDateString(), the same shape and
// the same comparison the soul store's `day` uses, so neither has to reason
// about timezones.
export const dueForSync = (syncedOn: string | null, now: Date): boolean =>
  syncedOn !== now.toDateString();
