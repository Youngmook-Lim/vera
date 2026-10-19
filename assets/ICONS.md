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

**The app's own icon is calm, not dormant (2026-10-19).** That is the
`foregroundImage` above and `icon.png` (calm over `icon-bg.png`, scaled to
1024), and it is what Settings, permission pop-ups and the badge on a
notification card draw — the subject did not want her dead eye there. The
dormant FACE is unchanged: the `.Icon_Dormant` alias, still the one enabled at
install, now has a generated drawable of its own (`ic_launcher_dormant`).

Two caveats: some launchers cache the icon until a reboot or home-screen
redraw, and an alias swap can drop a pinned shortcut.

## Light set (2026-10-08)

The same nine faces in the light theme's finish — `1f BRUSHED INSTRUMENT`
from `design/Light Optic Options.dc.html` — on `icon-bg-light.png`, whose edge
is `#eceef0`, the light stage. Rendered, not exported: there is no design for
them. Regenerate with:

```sh
node tools/build-icons.mjs                 # writes the light set
node tools/build-icons.mjs --check <dir>   # renders the DARK set into <dir>
```

The second command is how the renderer is trusted: it redraws this table's
nine and they land within a mean 3.9/255 of the files above.

| file | alias |
| --- | --- |
| `icon-bg-light.png` | shared light adaptive background |
| `icon-fg-light-dormant.png` | `.Icon_Light_Dormant` |
| `icon-fg-light-<face>.png` | `.Icon_Light_<Face>` |

Same day rule: the day picks the face, the theme picks the drawing.

What the recipe above leaves out, measured off the dark set and applied to
both: "seam ×1.36" is a stroke width (iris ring, seam, engraved rings); the
socket is inset 5, not 4; lids rest at 0.87 of the live eye's height; the iris
ring is a band inside the iris edge; one engraved ring; no fibre, no lid grain.

