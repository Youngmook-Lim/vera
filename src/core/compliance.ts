// Pure functions: compliance is math over (persisted dates, now) — nothing
// runs in the background (docs/architecture.md "Key mechanics decisions").

export const dayKey = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

export const prevDayKey = (d: Date): string => {
  const p = new Date(d);
  p.setDate(p.getDate() - 1);
  return dayKey(p);
};

export type ComplianceState = 'done' | 'due' | 'missed';

export const assessCompliance = (lastComply: string | null, now: Date): ComplianceState => {
  if (lastComply === dayKey(now)) return 'done';
  if (lastComply === null || lastComply === prevDayKey(now)) return 'due';
  return 'missed';
};

export const tenureDays = (enrolledAt: string | null, now: Date): number => {
  if (!enrolledAt) return 1;
  const [y, m, d] = enrolledAt.split('-').map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.max(1, Math.round((today - start) / 86400000) + 1);
};

// "Even routine compliance is occasionally audited. Today is occasionally."
export const rollAudit = (): boolean => Math.random() < 0.2;
