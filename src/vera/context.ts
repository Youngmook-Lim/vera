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
export const buildContext = (input: ContextInput): SpeakContext => {
  const hour = input.now.getHours();
  const ctx: SpeakContext = {
    time_of_day: bucket(hour),
  };

  const hoursAway = input.lastOpen == null ? null : (input.now.getTime() - input.lastOpen) / 3_600_000;

  if (hour < 5) ctx.notable = 'they are awake at an indefensible hour';
  if (hoursAway != null && hoursAway > 72) ctx.notable = `gone ${Math.round(hoursAway / 24)} days`;
  else if (input.visits >= 5) ctx.notable = `this is return number ${input.visits} today`;

  if ((input.now.getTime() - input.askedAt) / 1000 > 240) ctx.they_took_their_time = true;

  return ctx;
};
