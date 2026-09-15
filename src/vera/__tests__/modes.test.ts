import { CORE_SOUL_MD } from '../soul';
import { MODES, MODE_ORDER, composeSoul, isMode } from '../modes/registry';

describe('the mode registry', () => {
  it('offers every mode it knows about, in a stable order', () => {
    expect(MODE_ORDER.length).toBe(Object.keys(MODES).length);
    for (const id of MODE_ORDER) expect(MODES[id].id).toBe(id);
  });

  it('labels every mode in both languages', () => {
    for (const id of MODE_ORDER) {
      expect(MODES[id].label.en.trim()).not.toBe('');
      expect(MODES[id].label.ko.trim()).not.toBe('');
    }
  });

  it('recognises a stored mode and refuses anything else', () => {
    for (const id of MODE_ORDER) expect(isMode(id)).toBe(true);
    expect(isMode('cruel')).toBe(false);
    expect(isMode(undefined)).toBe(false);
  });
});

describe('composeSoul', () => {
  // The core ends where it ends and the mode owns its own headings: the app
  // adds no separator, no label and no words of its own to a document that is
  // meant to read as hers.
  it('puts the core first and the mode after it, with nothing in between', () => {
    for (const id of MODE_ORDER) {
      const doc = composeSoul(id);
      expect(doc.startsWith(CORE_SOUL_MD)).toBe(true);
      expect(doc.endsWith(MODES[id].soul)).toBe(true);
      expect(doc.replace(CORE_SOUL_MD, '').replace(MODES[id].soul, '').trim()).toBe('');
    }
  });

  // Whatever a mode says about how to treat the subject, this survives it.
  it('carries the ethical floor into every mode', () => {
    for (const id of MODE_ORDER) {
      expect(composeSoul(id)).toContain('Never be unkind about what they did not choose');
    }
  });
});

describe('what no mode may reintroduce', () => {
  it('never mentions the specimen, the rooms, or repeat erasure', () => {
    for (const id of MODE_ORDER) {
      const doc = composeSoul(id);
      expect(doc).not.toContain('Specimen-03');
      expect(doc).not.toContain('Module 01');
      expect(doc).not.toContain('centrifuge');
      expect(doc).not.toContain('Repeat erasure');
      expect(doc).not.toContain('rooms');
    }
  });

  it('never transliterates her name', () => {
    for (const id of MODE_ORDER) expect(composeSoul(id)).not.toContain('베라');
  });
});
