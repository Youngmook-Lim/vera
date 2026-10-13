import React from 'react';
import { useFacilityStore } from '../core/store';
import { providerFor } from '../vera/providers';
import { voiceSupported } from '../vera/voice/tts';
import { PrefRow } from './PrefRow';
import { T } from './strings';

// Her voice, and the shell's own row — named in SystemScreen directly, beside
// TRANSMISSIONS, for the same reason: she is not a module. On a key with no
// speech endpoint it says so instead of offering a switch that would do
// nothing.
export function VoiceRow() {
  const lang = useFacilityStore((s) => s.lang);
  const voice = useFacilityStore((s) => s.voice);
  const setVoice = useFacilityStore((s) => s.setVoice);
  const apiKey = useFacilityStore((s) => s.apiKey);
  const t = T[lang];
  const supported = voiceSupported(providerFor(apiKey)?.label);

  return (
    <PrefRow
      testID="pref-voice"
      label={t.voice}
      value={!supported ? t.notOnKey : voice ? t.on : t.off}
      onPress={supported ? () => void setVoice(!voice) : undefined}
    />
  );
}
