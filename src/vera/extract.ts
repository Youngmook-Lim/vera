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
