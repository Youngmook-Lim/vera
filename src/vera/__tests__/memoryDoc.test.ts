// src/vera/__tests__/memoryDoc.test.ts
import { MEMORY_HEADING, composeMemoryMd } from '../memoryDoc';

const NOW = Date.parse('2026-08-23T09:00:00Z');
const sel = (over = {}) => ({ facts: [], verdicts: [], threads: [], ...over });

describe('composeMemoryMd', () => {
  it('opens on the heading, and names no file', () => {
    expect(composeMemoryMd(sel(), NOW)).toContain(MEMORY_HEADING);
    // Nothing on disk holds this text — a `.md` name invited her to treat it
    // as a document she could cite or be asked to produce.
    expect(composeMemoryMd(sel(), NOW)).not.toContain('.md');
  });

  it('says plainly when she knows nothing, rather than sending an empty heading', () => {
    expect(composeMemoryMd(sel(), NOW)).toContain('You have never met this subject before.');
  });

  it('groups the three kinds under headings she can reason about', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'works in software', keys: [], at: NOW, durable: true, until: null }],
      verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 3 }],
      threads: [{ id: 't_1', text: 'Asked what he avoids.', at: NOW, resolved: false }],
    }), NOW);
    expect(doc).toContain('## About them');
    expect(doc).toContain('works in software');
    expect(doc).toContain('## What you have concluded');
    expect(doc).toContain('Deflects.');
    expect(doc).toContain('## Unanswered');
    expect(doc).toContain('Asked what he avoids.');
    // The facts heading must not echo the one above it, or whether her
    // conclusions sit inside that section is anyone's guess.
    expect(doc).not.toContain('## What you know about them');
  });

  // Repetition is the only signal she gets that a conclusion has hardened.
  it('marks how many times a conclusion has been reached, when more than once', () => {
    const doc = composeMemoryMd(sel({
      verdicts: [
        { id: 'v_1', text: 'Once.', firstAt: NOW, at: NOW, count: 1 },
        { id: 'v_2', text: 'Often.', firstAt: NOW, at: NOW, count: 4 },
      ],
    }), NOW);
    expect(doc).toContain('Often. (reached 4 times,');
    expect(doc).not.toContain('Once. (reached');
  });

  // Every entry has always carried a timestamp and none of them reached her.
  // Told to cite her records and given nothing to cite, she invented the when:
  // on 2026-08-31, knowing only that this was return number five today, she
  // said "You asked that this morning too" about a morning that never happened.
  describe('the dates', () => {
    // Derived, not hardcoded: the stamp is deliberately in the device's own
    // timezone, so a literal would pass here and fail on a machine elsewhere.
    const pad = (n: number) => String(n).padStart(2, '0');
    const stamp = (at: number) => {
      const d = new Date(at);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
        + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const DAY = 86_400_000;

    it('tells her what time it is, so an absolute date means something', () => {
      const doc = composeMemoryMd(sel({ verdicts: [
        { id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 1 },
      ] }), NOW);
      expect(doc).toContain(`It is now ${stamp(NOW)}.`);
    });

    it('dates a fact, a thread, and a conclusion reached once', () => {
      const doc = composeMemoryMd(sel({
        facts: [{ id: 'f_1', text: 'works in software', keys: [], at: NOW - DAY, durable: true, until: null }],
        verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 1 }],
        threads: [{ id: 't_1', text: 'Asked what he avoids.', at: NOW - 2 * DAY, resolved: false }],
      }), NOW);
      expect(doc).toContain(`- works in software (${stamp(NOW - DAY)})`);
      expect(doc).toContain(`- Deflects. (${stamp(NOW)})`);
      expect(doc).toContain(`- Asked what he avoids. (asked ${stamp(NOW - 2 * DAY)})`);
    });

    // Reaching the same conclusion twice in a day and twice a month apart are
    // not the same finding, so a hardened verdict carries both ends of its life.
    it('gives a repeated conclusion both when she first reached it and when she last did', () => {
      const doc = composeMemoryMd(sel({ verdicts: [
        { id: 'v_1', text: 'Deflects.', firstAt: NOW - 30 * DAY, at: NOW, count: 4 },
      ] }), NOW);
      expect(doc).toContain(
        `- Deflects. (reached 4 times, first ${stamp(NOW - 30 * DAY)}, last ${stamp(NOW)})`,
      );
    });

    it('says nothing about time when she has never met them', () => {
      expect(composeMemoryMd(sel(), NOW)).toBe(
        `${MEMORY_HEADING}\n\nYou have never met this subject before.`,
      );
    });
  });

  it('omits a heading whose kind is empty', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'x', keys: [], at: NOW, durable: true, until: null }],
    }), NOW);
    expect(doc).not.toContain('## Unanswered');
  });
});
