export interface Exchange {
  you: string | null;
  her: string;
}

export interface SpeakContext {
  time_of_day: string;
  recent_exchanges: Exchange[];
  what_you_have_concluded_about_them: string[];
  notable?: string;
  they_took_their_time?: true;
  specimen?: string;
  erasures?: number;
}

export interface ContextInput {
  now: Date;
  lastOpen: number | null;
  askedAt: number;
  visits: number;
  hunger: number;
  cleared: number;
  mem: Exchange[];
  impressions: string[];
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
    recent_exchanges: input.mem.slice(-6),
    what_you_have_concluded_about_them: input.impressions,
  };

  const hoursAway = input.lastOpen == null ? null : (input.now.getTime() - input.lastOpen) / 3_600_000;

  if (hour < 5) ctx.notable = 'they are awake at an indefensible hour';
  if (hoursAway != null && hoursAway > 72) ctx.notable = `gone ${Math.round(hoursAway / 24)} days`;
  else if (input.visits >= 5) ctx.notable = `this is return number ${input.visits} today`;

  if ((input.now.getTime() - input.askedAt) / 1000 > 240) ctx.they_took_their_time = true;
  if (input.hunger > 90) ctx.specimen = 'the specimen is genuinely suffering';
  if (input.cleared > 1) ctx.erasures = input.cleared;

  return ctx;
};
