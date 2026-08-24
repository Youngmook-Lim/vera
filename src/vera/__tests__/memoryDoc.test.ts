// src/vera/__tests__/memoryDoc.test.ts
import { composeMemoryMd } from '../memoryDoc';

const NOW = Date.parse('2026-08-23T09:00:00Z');
const sel = (over = {}) => ({ facts: [], verdicts: [], threads: [], ...over });

describe('composeMemoryMd', () => {
  it('opens as the document she is told is hers', () => {
    expect(composeMemoryMd(sel())).toContain('# MEMORY.md');
  });

  it('says plainly when she knows nothing, rather than sending an empty heading', () => {
    expect(composeMemoryMd(sel())).toContain('You have never met this subject before.');
  });

  it('groups the three kinds under headings she can reason about', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'works in software', keys: [], at: NOW, durable: true, until: null }],
      verdicts: [{ id: 'v_1', text: 'Deflects.', firstAt: NOW, at: NOW, count: 3 }],
      threads: [{ id: 't_1', text: 'Asked what he avoids.', at: NOW, resolved: false }],
    }));
    expect(doc).toContain('## What you know about them');
    expect(doc).toContain('works in software');
    expect(doc).toContain('## What you have concluded');
    expect(doc).toContain('Deflects.');
    expect(doc).toContain('## Unanswered');
    expect(doc).toContain('Asked what he avoids.');
  });

  // Repetition is the only signal she gets that a conclusion has hardened.
  it('marks how many times a conclusion has been reached, when more than once', () => {
    const doc = composeMemoryMd(sel({
      verdicts: [
        { id: 'v_1', text: 'Once.', firstAt: NOW, at: NOW, count: 1 },
        { id: 'v_2', text: 'Often.', firstAt: NOW, at: NOW, count: 4 },
      ],
    }));
    expect(doc).toContain('Often. (reached 4 times)');
    expect(doc).not.toContain('Once. (reached');
  });

  it('omits a heading whose kind is empty', () => {
    const doc = composeMemoryMd(sel({
      facts: [{ id: 'f_1', text: 'x', keys: [], at: NOW, durable: true, until: null }],
    }));
    expect(doc).not.toContain('## Unanswered');
  });
});
