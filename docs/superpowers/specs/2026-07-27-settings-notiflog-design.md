# Settings + Transmission Log — screen design

*Decided 2026-07-27. Phase 5 (Polish) — first two screens: `settings` + `notiflog`. Design spec: `design/README.md` + `design/The Facility.dc.html` (settings: lines 601–652; notiflog: lines 654–712; strings: en 838–918, ko 1005–1059). Screenshots: `design/screenshots/07-settings.png`, `design/screenshots/15-notiflog.png`.*

## Summary

Build the two remaining shell screens that the app already routes to but renders as placeholders:

- **Settings** (`SUBJECT PREFERENCES`) — a **light** screen (`#ecebe4`): language switch, a "Program" card (re-process intake / notifications toggle / transmission-log link), a V.E.R.A. line, and a build-stamp footer.
- **Transmission Log** (`notiflog`) — a **dark** screen (`#131211`): a mostly-static authored list of the day's five V.E.R.A. transmissions, reached from the settings row.

Both are shell screens (siblings of `daily`/`enrollment`), each in its own folder with co-located `strings.ts` + tests.

## Shared message copy (correct dependency direction)

`core/notifications.ts` already holds `notifStrings` with the comment *"The phase-5 Transmission Log screen will share this table."* Honor that:

- **Extend + export `notifStrings`** (core) with the four display-only message fields the log needs and the planner does not: `senderOrg`, `senderHaz`, `n2Body`, `n4Body`. Keep the existing `sender`, `n1Title`, `n1Body`, `n3Body`, `n5Title`, `n5Body`.
- `planTransmissions` is **unchanged** — it keeps scheduling only its n1/n3/n5 subset.
- `notiflog` imports the message copy from `core/notifications.ts` (shell → core; core must never import from shell).
- Screen **chrome** (titles, date, action labels, footer, section labels) lives in each screen's own `strings.ts`, ported verbatim.

## Settings screen (`src/shell/settings/`)

Light screen, `palette.light` tokens. Layout top → bottom (mock lines 603–650):

- **Sticky header** (`#ecebe4`, border `#dcd9cf`): back arrow (`◂`, `#3f3d37`) + `SUBJECT PREFERENCES` (`settingsTitle`); right-aligned static `#50640` (`#8a8578` mono).
- **Language of compliance** (`langOfCompliance`, dim label):
  - Two side-by-side buttons: **English** and **한국어**. The selected language's button is highlighted (green fill/border + a ✓ tick); the other is plain. Tapping a button calls the existing `setLang(lang)` (already live + persisted to `KEYS.lang`).
  - A green-dot note below: `detectedNote` = "Change applies immediately."
- **Program** (`programWord`, dim label) — a card (`#f4f3ee`, border `#dcd9cf`, radius 13) with three rows separated by `#e4e1d7` dividers:
  1. **Re-process intake** (`reprocess` / `reprocessSub`) → chevron `▸`. Calls new store action `reprocess()` (full wipe — see Store changes).
  2. **Notifications** (`notif` / `notifSub`) → a custom toggle (track + knob; amber `#f4b43a` track when on, dim when off; `accessibilityRole="switch"`, `accessibilityState={{ checked }}`). Calls new async store action `updateNotif(enabled)`.
  3. **Transmission log** (`notifLog` / `notifLogSub`) → chevron `▸`. Calls `setStep('notiflog')`.
- **V.E.R.A.** — a dark inline card (`#17171a`, orange left border `#ff6a1a`, amber `V.E.R.A.` kicker) with `settingsVera`. (This is a bespoke inline block per the mock, not the shared `VeraPanel` — no LIVE dot/REC here.)
- **Footer** (centered, `#b3aea1`): `PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640` (static constant, identical both langs).

Screen is a `ScrollView` under a fixed header. Reads `lang`; no local state (toggle/langs read from the store).

### Language preserved on re-process
`reprocess()` is a **full wipe**: it removes every persisted key and resets in-memory state to defaults, **except it keeps the current in-memory `lang`** so the intake screen renders in the language the subject is currently reading (they can still change it in intake). The persisted `KEYS.lang` is wiped with everything else, so a subsequent cold launch re-detects the device locale via `hydrate()`.

## Transmission Log screen (`src/shell/notiflog/`)

Dark screen (`#131211`), a mostly-static authored artifact (like `hazard`'s census). Layout (mock lines 656–710):

- **Sticky header** (`#131211`, border `#26251f`): back arrow (`◂`, `#8a8578`) **→ settings** (not facility — the log is reached through settings) + `TRANSMISSION LOG` (`notifLogTitle`); right-aligned static date `notifLogDate` (`MON, MAR 2` / `3월 2일 (월)`, `#57534a` mono).
- **Five cards** in a column (`gap: 8`), driven by a lang-independent structural array combined with copy from the shared `notifStrings[lang]` + local chrome:

  | # | time | sender | dot | size | title | body | actions |
  |---|------|--------|-----|------|-------|------|---------|
  | 1 | 09:00 | `sender` | amber `#f4b43a` | big | `n1Title` | `n1Body` | **COMPLY NOW**→daily · DEFER (RECORDED) inert |
  | 2 | 11:30 | `senderOrg` | green `#4fd08a` | small | — | `n2Body` | — |
  | 3 | 14:12 | `sender` | amber `#f4b43a` | small | — | `n3Body` | — |
  | 4 | 17:40 | `senderHaz` | red `#ff5a48` | small | — | `n4Body` | — |
  | 5 | 21:47 | `sender` | orange `#ff6a1a` | big | `n5Title` | `n5Body` | `nRemain` badge (`#ff5a48`) · **COMPLY NOW**→daily |

  - **Big cards** (1, 5): `#201f1bf2` bg, radius 24, a 30×30 avatar tile with a glowing radial dot (color per row), sender+time row, title (bold), body, and an actions row. Card 5's border is `#ff6a1a44` and it carries the `nRemain` badge in the header row.
  - **Small cards** (2, 3, 4): `#1c1b17e6` bg, radius 20, a 22×22 avatar tile + sender/time row + body only.
  - Dot styling: a small circle with a radial highlight; `nComply` (`COMPLY NOW`) is a pressable → `setStep('daily')`; `nDefer` (`DEFER (RECORDED)`) is inert grey text.
- **Footer** (centered, `#57534a`): `nFooter` = "end of log · V.E.R.A. is aware you read this".

Interactivity: back → settings; the two COMPLY NOW actions → daily. Everything else is static. `nRemain` and `notifLogDate` are **static/verbatim** per the copy convention (a live countdown / real date is a possible later polish, out of scope here).

Screen is a `ScrollView` under a fixed header. Reads `lang`.

## Store / router / storage changes

### `src/core/storage.ts`
- Add `clearAll: () => AsyncStorage.multiRemove(Object.values(KEYS))` to the `storage` seam.

### `src/core/store.ts`
- Add `reprocess(): Promise<void>` — `await storage.clearAll()`; reset all in-memory fields to their initial defaults **except keep the current `lang`** (and `hydrated: true`); `set({ step: 'intake' })`. (Mirrors the prototype's `reprocess` but wipes the full native record.)
- Add `updateNotif(enabled: boolean): Promise<void>` — `set({ notif: enabled })`; `await storage.set(KEYS.notif, enabled ? '1' : '0')`; `await syncScheduledTransmissions(enabled, get().lang)`. (Import `syncScheduledTransmissions` from `core/notifications.ts`.) The existing synchronous `setNotif` stays for the enrollment flow.

### `src/core/notifications.ts`
- Widen `notifStrings` (en + ko) with `senderOrg`, `senderHaz`, `n2Body`, `n4Body`; `export` the const so `notiflog` can import it. `planTransmissions` unchanged.

### `src/shell/ScreenRouter.tsx`
- Import `SettingsScreen`, `NotifLogScreen`; add `settings` and `notiflog` to `SHELL_SCREENS`.
- Add `settings` to `LIGHT_STEPS` (notiflog stays dark → light status icons default).
- In the hardware-back handler, special-case `notiflog` → `setStep('settings')` (mirrors its ◂ arrow) before the general "everything else → facility" fallback.
- Remove the now-obsolete `{/* settings and notiflog arrive in phase 5 */}` comment.

## Files

| File | Change |
|---|---|
| `src/core/storage.ts` | Add `clearAll()` to the seam. |
| `src/core/store.ts` | Add `reprocess()` + `updateNotif()`. |
| `src/core/notifications.ts` | Widen + export `notifStrings` (add `senderOrg`, `senderHaz`, `n2Body`, `n4Body`). |
| `src/shell/settings/strings.ts` | New. Settings chrome (verbatim en+ko): `settingsTitle`, `code` (`#50640`), `langOfCompliance`, `detectedNote`, `programWord`, `reprocess`, `reprocessSub`, `notif`, `notifSub`, `notifLog`, `notifLogSub`, `settingsVera`, `veraKicker` (`V.E.R.A.`), `build` (`PERSONAL ENRICHMENT PROGRAM · BUILD 5.0640`). |
| `src/shell/settings/SettingsScreen.tsx` | New. The light settings screen + a small custom notifications toggle. |
| `src/shell/settings/__tests__/` | Screen test. |
| `src/shell/notiflog/strings.ts` | New. Log chrome (verbatim en+ko): `notifLogTitle`, `notifLogDate`, `nComply`, `nDefer`, `nRemain`, `nFooter`. Plus the lang-independent `CARDS` structural array (time, dot color, size, `senderKey`, `titleKey?`, `bodyKey`, `comply?`, `defer?`, `remain?`). |
| `src/shell/notiflog/NotifLogScreen.tsx` | New. The dark transmission-log screen; renders `CARDS` with copy from `notifStrings[lang]` + chrome. |
| `src/shell/notiflog/__tests__/` | Screen test. |
| `src/shell/__tests__/ScreenRouter.test.tsx` | Update: `settings`/`notiflog` now render real screens, not placeholders. |

Conventions: `ms()`, `font(role, weight, lang)`, `palette` (`palette.light` for settings) + prototype hexes verbatim. No new storage keys (re-process reuses `clearAll`).

## Data flow

```
Facility → (prefs button) → settings
settings:
  tap English/한국어 → setLang(lang)            // live + persisted
  tap Re-process     → reprocess()  → wipe + step='intake'
  toggle Notifications → updateNotif(v) → set + persist + syncScheduledTransmissions(v, lang)
  tap Transmission log → setStep('notiflog')
  back ◂ / hardware back → facility
notiflog:
  tap COMPLY NOW (cards 1,5) → setStep('daily')
  back ◂ / hardware back → settings
```

## Error handling

- `reprocess`/`updateNotif` await storage; storage failures are non-fatal (the app already tolerates storage failure in `hydrate`). `syncScheduledTransmissions` is already wrapped in its own try/catch and Expo-Go-gated — a courtesy that never blocks.
- No network, no sensors. Notiflog is static content. Minimal failure surface.

## Testing

Per repo conventions (`CLAUDE.md`): `npm test` + `npx tsc --noEmit`; Jest 29; async RTL v14 (`await render`, `await fireEvent`); `globalThis` not `global`.

- **Settings screen:**
  - renders header, both language buttons, all three Program rows, the V.E.R.A. line, and the build footer.
  - tapping 한국어 calls `setLang('ko')` (assert store `lang`); the selected button shows its tick.
  - Re-process row calls `reprocess`; assert storage cleared (spy/mock `clearAll` or assert keys gone) and `step === 'intake'`.
  - Notifications toggle calls `updateNotif` — assert `notif` state flips, `KEYS.notif` persisted, and `syncScheduledTransmissions` invoked (mock it).
  - Transmission-log row → `step === 'notiflog'`.
  - back arrow → `step === 'facility'`.
  - renders in both `en` and `ko`.
- **Notiflog screen:**
  - renders all five cards: each sender label, each body (`n1Body`…`n5Body`), both titles, and the `nRemain` badge.
  - a `COMPLY NOW` press → `step === 'daily'`.
  - back arrow → `step === 'settings'`.
  - renders the footer; renders in both `en` and `ko`.
- **Store:** `reprocess()` clears storage + resets state + `step='intake'` + preserves `lang`; `updateNotif(true/false)` sets state, persists, calls the executor.
- **Router:** update the existing "module steps render…" siblings — `settings` renders `SUBJECT PREFERENCES` (real), `notiflog` renders `TRANSMISSION LOG` (real); `settings` gets dark status icons via `LIGHT_STEPS`.

## Out of scope

- Live `nRemain` countdown / real current date on the log (static/verbatim for now).
- Broader boot-time / enrollment notification scheduling (the toggle wires scheduling at its own point; a global scheduling pass is separate).
- Korean native-speaker comedy pass (later Phase 5 task).
- The transmission log deriving its list from `planTransmissions` (the log is an authored 5-card artifact; the planner schedules a 3-slot subset — deliberately different).

## Phase 5 progress

These are the first two Phase 5 screens. Remaining Phase 5 after this: Korean native-speaker copy pass, EAS build for friends. Update `CLAUDE.md` when this merges (note settings + transmission log done).
