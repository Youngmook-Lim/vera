import type { Verdict } from './memory';

export interface StoredImpression {
  text: string;
  at: string;
}

// The v2 impressions become verdicts (continuity §7). Their dates cannot be
// recovered: `at` was a display string produced by mmmdd() for the RECORD
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
