# App icon — nine faces

432×432 (108dp @ 4x). Optic at 60% of the canvas, so it sits inside the 66dp
safe circle and clears every launcher mask. Every value is read off
`src/vera/emotions.ts` and `src/shell/Optic.tsx`, then put through one
icon-scale transform: aperture +10pts, pupil +3pts, seam ×1.36, glow ×1.65.

## Files

| file | alias | when |
| --- | --- | --- |
| `icon-bg.png` | — | shared adaptive background, `#131011` |
| `icon-fg-dormant.png` | `.Icon_Dormant` | no key in the Keystore — override, never in the cycle |
| `icon-fg-calm.png` | `.Icon_Calm` | epoch day mod 8 = 0 |
| `icon-fg-amused.png` | `.Icon_Amused` | 1 |
| `icon-fg-pleased.png` | `.Icon_Pleased` | 2 |
| `icon-fg-suspicious.png` | `.Icon_Suspicious` | 3 |
| `icon-fg-affectionate.png` | `.Icon_Affectionate` | 4 |
| `icon-fg-bored.png` | `.Icon_Bored` | 5 |
| `icon-fg-alarmed.png` | `.Icon_Alarmed` | 6 |
| `icon-fg-disappointed.png` | `.Icon_Disappointed` | 7 |

Order is deliberate: no two dim states adjacent, and the two greys sit either
side of the loudest face so a dull week never happens.

## Rotation

```ts
const ORDER = ['Calm','Amused','Pleased','Suspicious',
               'Affectionate','Bored','Alarmed','Disappointed'];

const face = hasKey
  ? ORDER[Math.floor(Date.now() / 86_400_000) % 8]
  : 'Dormant';
```

Epoch days, not day-of-year: 365 is 5 mod 8, so a day-of-year rotation would
skip three faces every New Year. Run the check on cold start and on key
add/remove; a daily WorkManager job catches days the app is never opened.

## app.json

`adaptiveIcon` takes one foreground, so the nine live as `activity-alias`
entries in the manifest (a config plugin, or prebuild + a manifest patch) with
`icon-bg.png` as the shared background:

```json
"adaptiveIcon": {
  "backgroundColor": "#131011",
  "foregroundImage": "./assets/icon-fg-dormant.png"
}
```

Ship dormant as the build-time default — a fresh install has no key yet, so the
first face is correct before any code runs.

Two caveats: some launchers cache the icon until a reboot or home-screen
redraw, and an alias swap can drop a pinned shortcut.
