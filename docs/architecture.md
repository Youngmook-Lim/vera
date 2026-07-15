# THE FACILITY — Architecture

*Decided 2026-07-15, after design handoff. Concept: [`design/the-facility.md`](../design/the-facility.md) · Design spec: [`design/README.md`](../design/README.md) + `design/The Facility.dc.html` (open in a browser).*

## Stack

| Choice | What | Why |
|---|---|---|
| **React Native + Expo** (TypeScript) | App framework & toolchain | Builder is a React web dev; Android first, iOS later from the same codebase. Expo manages the native layer, sensor/notification APIs, and cloud builds. |
| **@shopify/react-native-skia** | GPU canvas | The entire UI is custom-drawn (blob, radar, compass, flame, optic eye — zero raster assets). Skia renders these as declarative components. |
| **react-native-reanimated** | Animations & gestures | Animation logic runs as worklets on the UI thread — stays 60fps regardless of JS-thread load. Drives hold-to-comply ring, needle wander, scanline sweep. |
| **Zustand** | State | One store; the prototype is a single state machine and this mirrors it. |
| **react-native-mmkv** | Persistence | Fast key-value (localStorage-equivalent). Streak, standing, enrollment flag, organism state, counters. SQLite only if a future module needs real queries. |
| **No navigation library** | — | The design routes on a single `step` value with instant swaps. Conditional rendering IS the router. Revisit only if deep-linking is ever needed. |

## Structure: shell + module registry

```
src/
  shell/          # enrollment flow, launcher home, daily loop, missed-day, settings
  vera/           # getTransmission(context) → line
                  #   v1: authored corpus (STR.en/STR.ko from prototype) + template vars
                  #   later: LLM behind the same interface — callers never know
  modules/        # one folder per evaluation, self-registering:
    results/      #   index.ts exports { id, tile, Screen, strings, locked? }
    incinerator/
    field/
    organism/
    hazard/
  core/           # persistence, sensors, notifications, i18n, theme tokens
```

**The contract:** a new toy = a new folder in `modules/` + one registry line. The shell renders tiles from the registry; locked "budget pending" vitrines are registry entries with `locked: true`. Nothing else changes. This is what makes the app ever-evolving.

## Key mechanics decisions

- **Event-driven on app-open; nothing runs in the background.**
  - **Queue number is a pure function** of (install date, now): base − ticks(elapsed) + seeded jumps. It "ticks while closed" because it's math, not a process. Live 1.1s re-evaluation only while the screen is open.
  - **Steps** read from the OS step counter on app open (Expo Pedometer); the organism eats the delta when visited. Organism hunger drifts by the same pure-function trick.
  - **Notifications are local + scheduled** (`expo-notifications`, channel "V.E.R.A."): on each app open, (re)schedule the next few days of transmissions. No push server. Content decided at schedule time — fine for an authored corpus.
- **Field Trials** is the only network feature: GPS + magnetometer via Expo; daily target from the Overpass API (OSM), cached. Offline fallback line: "Target obscured. V.E.R.A. blames weather."
- **i18n:** port the prototype's `STR.en` / `STR.ko` keyed tables as typed string modules, per screen/module. Korean needs a native-speaker comedy pass before sharing widely.
- **Fonts** bundled as assets: Space Grotesk (display), IBM Plex Mono (telemetry), Pretendard (Hangul). No CDN at runtime.
- **Design tokens** from `design/README.md` become `core/theme.ts` (dual moods: dark = V.E.R.A.'s domain, light enamel = bureaucracy).

## V.E.R.A.'s brain

**Authored corpus at launch** — no LLM, no API cost, works offline, jokes stay quality-controlled. Lines take template variables fed by real device data ("You walked {pct}% less today. Noted.").

**LLM later, behind the same seam.** When/if live-LLM lands:
- Personal use: builder's own key on-device is acceptable.
- Distribution: key must live server-side — a Cloudflare Worker holding the key, per-device rate limits (rate-limit message doubles as V.E.R.A. dialogue), system prompt kept server-side. An app binary cannot hold secrets (APK is unzippable). BYOK (friends paste their own key) is an acceptable interim.

## Deployment

1. **Dev:** Expo dev build on the builder's phone, hot reload.
2. **Friends:** `eas build -p android --profile preview` → APK → share directly. No store.
3. **Play Store (later, optional):** same project → AAB + privacy policy + data-safety forms. Nothing chosen now blocks it.
4. **iOS (later):** same codebase; needs Apple dev account. Real work: permission ceremonies + HealthKit for steps. Design is platform-agnostic by construction.

**No backend server exists in this architecture.** The only future trigger for one is distributed live-LLM V.E.R.A. (→ Cloudflare Worker, not a home server).

## Build order (phases)

1. **Scaffold + theme + shell skeleton** — Expo project, fonts, tokens, `step` state machine, launcher home with dummy tiles
2. **Enrollment flow** (intake → baseline → consent → assigned → permission) + first-run gate
3. **Daily loop + streak/standing + missed-day** + local notifications
4. **Modules, one at a time** (each is an independent slice): results → incinerator → organism → field → hazard
5. **Polish:** transmission log, settings, Korean copy pass, EAS build for friends

Implementation risks called out by the design handoff: timer cleanup on screen exit, hold-gesture cancellation (finger-lift, finger-slide-off, leave-screen), the Field Trials arrival guard (finishing pointer-up must not double as the exit tap), Skia learning curve on the five drawn centerpieces.
