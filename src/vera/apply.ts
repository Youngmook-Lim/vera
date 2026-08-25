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
