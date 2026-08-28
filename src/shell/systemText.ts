import type { SystemCode } from '../core/store';
import { T, type ChromeStrings } from './strings';

// The wording for a system notice, resolved at render rather than stored.
//
// The store keeps a `SystemCode`, not prose: core has never imported from
// shell, and a string frozen at write time would stay in whichever language
// was current when the credential was refused. Resolving here means the
// notice re-reads correctly the moment the subject switches language.
export const SYSTEM_TEXT: Record<SystemCode, (t: ChromeStrings) => string> = {
  auth: (t) => t.authNotice,
  quota: (t) => t.quotaNotice,
};

export const systemTextFor = (code: SystemCode, lang: keyof typeof T): string =>
  SYSTEM_TEXT[code](T[lang]);
