// Only what is true of this moment. Everything about the subject travels in
// her record now, and the session itself travels as real turns (continuity §2).
export interface SpeakContext {
  time_of_day: string;
  notable?: string;
  they_took_their_time?: true;
}

export interface ContextInput {
  now: Date;
  lastOpen: number | null;
  askedAt: number;
  visits: number;
  // The notable fact she has already been given this session, or null. See
  // below: this is what keeps one from being handed over on every single turn.
  notableSaid: string | null;
}

const bucket = (hour: number): string =>
  hour < 5 ? 'the small hours'
    : hour < 12 ? 'morning'
      : hour < 18 ? 'afternoon'
        : hour < 23 ? 'evening'
          : 'near midnight';

// She is given at most ONE notable circumstance, because a fact in the context
// is a fact she will recite, and silence about the numbers is more menacing
// than reporting them (SOUL.md).
//
// And at most one PER SESSION (2026-09-11). Every input here is fixed for the
// length of a session — `visits` only moves at hydrate, `lastOpen` is the
// previous open — so this used to compute the same sentence on every reply and
// hand it over again each time. She was not fixated on being told she had
// returned seven times; she was being told afresh every time she spoke, and
// reciting it was the obedient thing to do. `notableSaid` is what she has
// already been given, and a fact is spent once delivered.
//
// It compares the VALUE rather than setting a flag: a fact that genuinely
// changes mid-session — they are still here when the hour rolls past five —
// is a different fact and is worth one delivery of its own.
export const buildContext = (input: ContextInput): SpeakContext => {
  const hour = input.now.getHours();
  const ctx: SpeakContext = {
    time_of_day: bucket(hour),
  };

  const hoursAway = input.lastOpen == null ? null : (input.now.getTime() - input.lastOpen) / 3_600_000;

  let notable: string | undefined;
  if (hour < 5) notable = 'they are awake at an indefensible hour';
  if (hoursAway != null && hoursAway > 72) notable = `gone ${Math.round(hoursAway / 24)} days`;
  else if (input.visits >= 5) notable = `this is return number ${input.visits} today`;

  if (notable != null && notable !== input.notableSaid) ctx.notable = notable;

  if ((input.now.getTime() - input.askedAt) / 1000 > 240) ctx.they_took_their_time = true;

  return ctx;
};
