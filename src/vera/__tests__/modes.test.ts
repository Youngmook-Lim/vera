import { CORE_SOUL_MD } from '../soul';
import { MODES, MODE_ORDER, composeSoul, isMode, soulConstName } from '../modes/registry';
import * as defaultMode from '../modes/default';
import * as supportiveMode from '../modes/supportive';

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

describe('the modes are actually different people', () => {
  it('gives every mode its own document and its own label', () => {
    const souls = new Set(MODE_ORDER.map((id) => MODES[id].soul));
    const labels = new Set(MODE_ORDER.map((id) => MODES[id].label.en));
    expect(souls.size).toBe(MODE_ORDER.length);
    expect(labels.size).toBe(MODE_ORDER.length);
  });

  // The licence to be unkind about the subject is the one thing that must not
  // leak across: it is the whole difference between these two.
  it('keeps the unkindness licence out of the supportive mode', () => {
    expect(MODES.default.soul).toContain('You may be unkind about the subject themselves');
    expect(MODES.supportive.soul).not.toContain('You may be unkind');
    expect(MODES.supportive.soul).toContain('never unkind about the subject');
  });
});

// Regenerating these with `npx jest -u` is a deliberate act: a change here is
// a change to who she is, not a test failure to wave through. Named one by one
// rather than looped, so that reordering MODE_ORDER cannot silently reassign a
// snapshot to the wrong mode.
describe('each register is pinned', () => {
  it('matches the default document', () => {
    expect(MODES.default.soul).toMatchSnapshot();
  });

  it('matches the supportive document', () => {
    expect(MODES.supportive.soul).toMatchSnapshot();
  });
});

// The SYSTEM screen shows these identifiers as the documents' names, which is
// only honest while they are identifiers. There are no .md files in this repo
// and never have been, so a name that drifted from its export would be the
// screen describing something that does not exist — the exact thing this
// naming replaced.
describe('the name the subject is shown', () => {
  const sources: Record<string, Record<string, unknown>> = {
    default: defaultMode,
    supportive: supportiveMode,
  };

  it('is a real export of the mode it names', () => {
    for (const id of MODE_ORDER) {
      expect(sources[id]).toHaveProperty(soulConstName(id));
    }
  });

  it('names the very text she is sent', () => {
    for (const id of MODE_ORDER) {
      expect(sources[id][soulConstName(id)]).toBe(MODES[id].soul);
    }
  });

  // An identifier is not copy, so it does not translate.
  it('is spelled the same whatever the interface is set to', () => {
    expect(soulConstName('supportive')).toBe('SUPPORTIVE_SOUL_MD');
    expect(soulConstName('default')).toBe('DEFAULT_SOUL_MD');
  });
});
