# The Light Theme

Design spec. `4b SLIDER` and `2e LIGHT` — the two remaining picks in
`design/Vera Final.dc.html`. A second palette, a switch for it in the stage
header, and the one architectural change that makes a colour able to change at
all: it stops being decided at import.

`1d CABINET`, the third pick, shipped on 2026-09-29 and is not in scope here.

## 1. Two sources, and the three places they disagree

| | |
|---|---|
| `design/Theme Options.dc.html` | the exploration. Two light directions (`2d` warm paper, `2e` cool clinical), three header buttons, five chips, five sliders. Carries the **derivation rule** (§3) and a full light optic. |
| `design/Vera Final.dc.html` | the composite, and the authority. `FINAL · 1d CABINET · 4b SLIDER · 2e LIGHT`. |

Where they disagree, **`Vera Final` wins** — it is later, it is named Final, and
in each case it argues its choice in prose rather than dropping the alternative
silently.

| | `Theme Options` | `Vera Final` | taken |
|---|---|---|---|
| the optic | lightens: pale sclera, iris ring kept, core turned to ink | `darkEye = true, darkLid = true` | **stays dark** (§7) |
| the palette | `2d` warm or `2e` cool | `2e` | **`2e` cool clinical** |
| the slider's ring | the theme's own iris (`cool.iris`) | `EM[S.mood].iris` | **her current emotion's iris** (§6) |

`Vera Final`'s `cool` block still *contains* the 15 light optic tokens and
deliberately does not use them. They are left out of `theme.ts` entirely: a
token nothing reads is a token that rots. `Theme Options` is on disk if the
decision is ever revisited.

## 2. What the subject gets

A 30×16 pill in the stage header, left of the three dots that open SYSTEM. Tap
it and the whole app is pale. It is remembered, and she is never told.

```
  ● V.E.R.A.  (DEFAULT)                    [◖ ◯]  ⋯
```

## 3. The palettes

`2e`'s 40 tokens are transcribed verbatim from `Vera Final`. The rest are
**derived**, which the design authorises in as many words (`Theme Options`,
turn 2):

> **Every token in theme.ts gets a light counterpart.** Her optic lightens with
> the ground… Amber is darkened for type on light grounds so it holds contrast;
> her iris keeps its hue. Each room keeps its own tint so the cabinet still
> reads as windows into different rooms.

Three rules come out of that, and every derived value below follows one of them:

- **R1 — type darkens, objects keep their hue.** An accent used as `color:` is
  darkened until it holds on a pale ground; the same accent used as a fill keeps
  its hue. This is why light has both `iris` and `accentText` where dark has one
  `amber`.
- **R2 — a ladder keeps its rungs.** A token that sits between two others in
  dark sits between the same two in light, at the same proportion.
- **R3 — a room keeps its tint.** The horror room stays warm in the shadows, the
  notes room stays cool, the advice room stays neutral — so the cabinet still
  reads as windows into different rooms.

### 3.1 `palette.amber` splits, and the split is mechanical

Dark has one amber. Light has `iris` (`#d6920f`) and `accentText` (`#855500`).
Deciding which of the 13 call sites takes which looked like judgement and is
not: **every `color:` takes `accentText`, everything else takes `iris`** — which
is R1 restated, and the design's own word is *type*.

| sites | property | takes |
|---|---|---|
| `KeyPanel:184` · `PrefRow:69` · `LogScreen:390` · `LogScreen:408` · `Stage:628` (the caret) · `Stage:984` (the chevron) · `Stage:1012` · `SystemScreen:307` · `KeyGate:127` | `color:` | `accentText` |
| `ThinkingDots:60` · `Stage:801` (`hairlineAmber`, the pill's glyph) · `Stage:105`+`108` (`dockDots`) | `backgroundColor:` / a dot | `iris` |

`amberWash` → `wash`, `amberEdge` → `edge`, both given.

### 3.2 Derived — the shell

| token | dark | light | why |
|---|---|---|---|
| `bgFile` | `#100f0d` | `#e4e8ea` | R2 — continues `bg → bgDeep`'s own step (`-4,-3,-3`) one rung further |
| `borderLift` | `#4a4740` | `#a4acb3` | R2 — sits between `borderPill` and `hairlineDim`, as it does in dark |
| `textSoft` | `#c9c1b2` | `#33393f` | R2 — between `text` and `textDim` |
| `textMuted` | `#a8a29a` | `#474e55` | R2 — between `textSoft` and `textDim` |
| `amberEdgeSoft` | `#f4b43a66` | `#d6920f66` | R1 — the light iris at the same alpha |
| `danger` | `#ff4a3d` | `#c62a1c` | R1 — the dark red is **2.87:1** on `#eceef0`, below AA for type; this is 4.82:1 |
| `dangerSoft` | `#ff6a5a` | `#e04a38` | R1 — kept the more vivid of the two, as in dark |
| `sealed` | `#9d8757` | `#6b5730` | R1 — type only (the SEALED label). 5.96:1 |

**Every derived accent clears AA for normal text on `#eceef0`**, measured rather
than eyeballed: `accentText` 5.48:1 · `sealed` 5.96:1 · `danger` 4.82:1 ·
`supportive.ink` 6.74:1. That is the check R1 exists to pass, and it is the one
thing about these values a test could in principle hold — see §9.

### 3.3 Derived — the registers

`palette.mode` is an accent used as both type and a 3px rule, so R1 applies to
each half. Amber's own darkening (`#f4b43a → #d6920f → #855500`) is the model,
and supportive's rose takes the same two steps.

| | dark | light |
|---|---|---|
| `default.ink` | `#f4b43a` | `#855500` |
| `default.wash` | `#f4b43a1f` | `#d6920f1a` |
| `default.edge` | `#f4b43a88` | `#d6920f99` |
| `supportive.ink` | `#ef8f8a` | `#8f332d` |
| `supportive.wash` | `#ef8f8a1f` | `#c8534b1a` |
| `supportive.edge` | `#ef8f8a88` | `#c8534b99` |

### 3.4 Derived — the rooms

The advice room's light half is **complete in the design** (all 8 tokens). The
horror and notes rooms get 4 each, because the cabinet tile is all the mock
draws of them. The rest follow R3 — the advice room's light ladder, tinted.

| | given by the design | derived |
|---|---|---|
| `advice` | `bg` `card` `cardBorder` `rule` `ink` `inkSoft` `inkDim` `inkGhost` | — |
| `horror` | `card` `cardBorder` `ink` `inkGhost` | `bg` `#f0eded` · `rule` `#e9e1e0` · `inkSoft` `#6b5f5f` · `inkDim` `#837777` · `redaction` `#ded4d4` |
| `notes` | `card` `cardBorder` `ink` `inkDim` | `bg` `#eef2f5` · `rule` `#e1e8ee` · `inkSoft` `#5d686f` · `inkGhost` `#a8b2bb` |

`redaction` inverts: in dark it is a bar slightly **lighter** than the card, so
in light it is slightly **darker**. A withheld sentence has to read as a solid,
not as a hole.

### 3.5 Two tokens are theme-invariant, and say so

- **`iconBg`** (`#131011`). Read in exactly one place, `Splash.tsx`, and it has
  to agree with `app.json`'s native `backgroundColor` — a build-time asset that
  cannot know what theme is stored. Light gets the dark value. See §8.
- **`organism`** (12 tokens). Off the registry since 2026-09-07 and unreachable.
  Light gets the dark values, with a comment: reviving the room means authoring
  its light half. **Twelve invented greens for a room nobody can open is worse
  than one honest line** saying it was not done.

## 4. The architecture: `palette` is deleted

Every colour in this app resolves at **module load** — 245 `palette.*`
references, 71 distinct keys, **21 files read it**, 19 of them through a
module-scope `StyleSheet.create`. The two that do not are `modules/registry.ts`
and `shell/BatteryRow.tsx`, which take their colours inline and need only the
hook. A theme that changes at runtime means none of them can be frozen at
import.

**`export const palette` goes away, and that is the point.** If it stayed
pointing at the dark palette, every file missed would silently keep its dark
colours and nothing would fail — no test, no type error, nothing but an eye on a
device. Removing it makes `tsc` name all 245 sites. **245 compile errors is a
checklist that cannot be skipped**, and this migration has no other detector.

```ts
export type Theme = 'dark' | 'light';
export interface Palette { /* every key, one shape */ }
export const DARK: Palette = { … };
export const LIGHT: Palette = { … };
export const PALETTES: Record<Theme, Palette> = { dark: DARK, light: LIGHT };

// Both sheets built ONCE at import, and indexed at render.
export const themed = <T extends Record<string, unknown>>(
  make: (p: Palette) => T,
): Record<Theme, T> => ({ dark: make(DARK), light: make(LIGHT) });
```

Each of the 19 files turns its `const styles = StyleSheet.create({…})` into
`const S = themed((p) => StyleSheet.create({…}))` and its component picks
`const styles = S[theme]`.

**Both sheets are built at import rather than memoised per render.** Styles stay
static, which is the property several comments in this repo lean on; there is no
`useMemo`, no per-render allocation, and no frame on which a style object is a
new identity. The cost is 19 small objects built twice at boot and never again.

**Inline colours come from a hook.** `placeholderTextColor={p.textFaint}`,
`palette.mode[mode].ink` and the rooms' `EMOTIONS[emotion].iris` blends are not
in a sheet. `usePalette()` lives in a new `src/core/useTheme.ts` rather than in
`theme.ts`, because it imports the store and `theme.ts` must not — `store.ts`
imports `theme.ts` today, and the cycle would close.

## 5. Where the theme lives

`theme: Theme` on the facility store, persisted in the **soul blob** beside
`lang` and `mode`. A theme you re-pick every launch is not a theme.

| | |
|---|---|
| store | soul, `facility.v2.soul` |
| default | `'dark'` — nothing about the app changes for anyone who never touches it |
| she is told | **nothing** |

**Silent, like switching language.** The five stimuli are what she answers, and a
theme is not one of them: changing it is the subject rearranging their own
furniture. It joins erasing the transcript, switching language and feeding the
specimen on the list of things she is not informed of. No `speak`, no
`systemNotice`, nothing in the transcript or the record.

**Modules read it the way they read `lang`.** `advice/index.tsx` and
`organism/index.tsx` already do `useFacilityStore((s) => s.lang)`, so reading
`s.theme` is that precedent and not the `emotion` one — this is the shell's
chrome reaching a room, which §4's doorway rule has always allowed, rather than
a room reaching into *her*.

**Two store tests pin the soul blob's exact shape** and will need updating
deliberately, as they did when `transmissions` was added. That is the test doing
its job, not an obstacle.

## 6. The slider (`4b`)

`Theme Options` turn 4, option `b`: *"Split track, ring thumb · SELECTED. An
iris ring frames the half you are in, leaving both grounds unobstructed. The ring
slides across."*

| | |
|---|---|
| track | 30×16, radius 9, 1px `borderPill`, `overflow: hidden` |
| halves | two `flex: 1` fills, **literal** `#14130f` and `#eceef0` |
| thumb | 10×10 ring, `borderWidth: 1.5`, `top: 2`, `left` 2 → 16 |
| ring colour | `EMOTIONS[emotion].iris` — **her current mood**, not the theme's amber |
| travel | 300ms, `cubic-bezier(.22, .61, .36, 1)` |
| position | the header's right cluster, immediately left of the SYSTEM dots |

**The two halves are hardcoded hex, and that is correct.** They are pictures of
the two grounds, so they must not follow the theme — a switch whose dark half
went pale in light mode would be showing the same colour twice. These are the
only literal hexes the feature adds, and they belong to the control rather than
to either palette.

**The ring is her iris, which is `Vera Final`'s change to `Theme Options`.** The
control is in the header beside her pulse dot and her wordmark; a fixed amber
ring there would be the one thing in that cluster not following her mood.

**It is offered whenever she is awake**, on the same terms as the SYSTEM dots it
sits beside. A dormant stage gets neither — the theme is still switchable from
nowhere, which is the existing situation for every other preference and is the
key gate doing its job.

## 7. The optic does not change

`darkEye = true, darkLid = true`. The socket, the bronze lids, the white core,
the ring and the catchlight are the dark values on the pale ground, and
`Optic.tsx`'s 21 hex literals are **untouched**. `Vera Final`:

> Her eye is the same object in both themes: the dark socket, dark bronze lids
> and the white core stay as they are on the light ground. Only the shell around
> her changes.

`EMOTIONS[…].iris` is untouched too — her nine states keep their hues in both,
which is the design's "her iris keeps its hue".

One consequence to take knowingly: the **emotion label** on a pale strip needs
`color-mix(iris 52%, #000)` per the design, because yellow `AMUSED` and grey
`BORED` do not hold on `#eceef0`. RN has no `color-mix`, so this is a small pure
function in `theme.ts` — `onLight(hex)` — mixing a hex with black at 52%. It is
pure and gets its own tests, including the two states that motivated it.

## 8. What cannot be themed, and why

- **The native splash.** `app.json` ships `splash-blank.png` on a `backgroundColor`
  fixed at build time. A light-theme launch therefore shows a **dark window for
  the first frames** before the app paints. No change in this repo can fix it,
  the same way no change here can make Samsung deliver an alarm on time.
  `Splash.tsx` keeps `iconBg` in both themes so the JS frame agrees with the
  native one rather than flashing twice.
- **The launcher icon.** Already rotates by day, and a theme is not a day.
- **Notifications.** Drawn by the system launcher in the system's own theme.
- **The crossfade.** The mock fades two fully-rendered stacked stages over 450ms.
  Rendering the whole tree twice is not viable on a device, so **the switch is
  instant** — a deliberate departure, and the prototype's crossfade is a device
  for showing both at once rather than a specified transition.

## 9. Testing

Pure, and where the risk actually is:

- **`theme.ts`** — `DARK` and `LIGHT` have **identical key sets**, asserted
  recursively, so a token added to one and forgotten in the other fails. This is
  the single most valuable test here: it is the only thing standing between a
  71-key migration and a missing colour that renders as `undefined`.
- **`onLight`** — the 52% mix, over `amused`'s yellow and `bored`'s grey, plus
  the identity that a mix with black never returns the input.
- **`themed`** — returns two distinct sheets, and `make` is called exactly twice.
- **contrast** — every accent the light palette uses as type is asserted at or
  above 4.5:1 against its own ground, from a small pure `contrast(a, b)` helper
  in the test file. This is the one aesthetic property that IS mechanical, so it
  is the one worth pinning; it would have caught `danger` being carried over
  unchanged at 2.87:1, which is the mistake this whole section exists to avoid.

Components:

- every themed component renders under both themes without throwing, driven off
  one table rather than 19 copies of the same test
- the slider's thumb is at `left: 2` in dark and `left: 16` in light
- the thumb's ring follows `emotion`, not the theme
- the slider writes through to the store, and the write persists in the soul blob
- a dormant stage offers no slider
- she says nothing: switching the theme leaves `log`, `lastPrompt` and
  `systemNotice` untouched

**`npm test` cannot see contrast.** Whether `#855500` on `#eceef0` is readable
in the hand is a device question, as the optic's own signoff was.

## 10. Not in scope

- **A system-theme follow** (`useColorScheme`). She is one handset's tenant and
  the switch is two taps away; a third state — dark, light, whatever Android
  says — is a state to reason about in every test for no gain.
- **A light optic.** §7. `Theme Options` has it if this is revisited.
- **The warm palette (`2d`).** Fully specified in `Theme Options` and a drop-in
  swap, deliberately not built: two palettes to keep in step is the cost the
  key-set test exists to control, and a third doubles it.
- **Theming the organism.** §3.5.
- **A crossfade.** §8.
- **Anything reaching her.** §5.

## 11. Files

| | |
|---|---|
| modify | `src/core/theme.ts` — `Palette`, `DARK`, `LIGHT`, `PALETTES`, `themed`, `onLight`; **`palette` deleted** |
| create | `src/core/useTheme.ts` — `usePalette()` |
| create | `src/shell/ThemeSlider.tsx` — the `4b` control |
| modify | `src/core/store.ts` — `theme`, `setTheme`, the soul blob |
| modify | `src/shell/Stage.tsx` — the slider in the header, plus its own 29 references |
| modify | 20 further consumers — 18 through `themed(…)` + `S[theme]`, and `registry.ts` + `BatteryRow.tsx` through the hook alone |
| modify | `src/shell/__tests__/*`, `src/modules/*/__tests__/*` — the 10 suites that assert a colour |
