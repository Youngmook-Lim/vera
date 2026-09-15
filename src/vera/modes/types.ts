import type { Strings } from '../../core/i18n';

// A mode is her register and how she aims her record at the subject. The core
// document (soul.ts) is everything a mode does not get to change: her name,
// what happened to her, her format limits, the ethical floor, and memory.
//
// Shaped after ModuleDef deliberately. A mode is one file exporting one of
// these plus one line in registry.ts, and no shell file names a mode.

export type Mode = 'default' | 'supportive';

export interface ModeDef {
  id: Mode;
  // What the stage pill and the SYSTEM row show. Carried here rather than in
  // shell/strings.ts so that adding a mode touches one folder.
  label: Strings<string>;
  // This mode's half of the document. It owns its own headings; composeSoul
  // adds nothing.
  soul: string;
}
