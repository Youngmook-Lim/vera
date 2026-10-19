# Her face on every card — design

**Date:** 2026-10-15
**Status:** decided in conversation, awaiting written review

## Intent

Every notification the app sends shows one of her faces where Samsung now
draws the app's base icon, which is the grey dormant eye. The face is chosen by what
the card is, and the finish follows the app's theme.

**What the subject asked for:** the eye on a notification should match the
notification. Fixed faces for the two rooms; a choice per note for NOTES TO
MYSELF.

**What was decided with them:**

| card | face |
|---|---|
| EXCELLENT ADVICE (09:00) | pleased |
| TWO SENTENCE HORROR (22:00) | alarmed |
| her transmissions (11:00, 16:00) | calm, in both registers |
| NOTES TO MYSELF | chosen per note; calm by default |
| finish | the app's theme **when the card arrives**: light theme → 1f's light eye, dark → the dark eye |

**What was ruled out first:** colouring the card itself. Android draws every
notification in the system's own theme, and only media and foreground-service
cards may be colourised. The app's per-app night mode does not reach the
notification shade. The accent colour is not drawn by Samsung's One UI at all.

## 1. What the device showed (spike, 2026-10-14)

A throwaway build (`spike/notif-eye`) posted test cards on the subject's
Samsung phone. The findings this design rests on:

| tried | collapsed card | expanded card |
|---|---|---|
| as today | base icon | base icon |
| `setLargeIcon` | base icon on the left; the face on the **right** | same |
| `MessagingStyle` sender picture | base icon, title gone | the face |
| **conversation**: `MessagingStyle` + a long-lived shortcut with a `Person` | **the face, with the base icon as a small badge** | the face |

1. **Only a conversation card shows the face collapsed.** That means
   `MessagingStyle`, `setShortcutId`, and a long-lived dynamic shortcut that
   carries the same `Person`.
2. **The face drawn is the SHORTCUT's icon, not the sender's.** Two cards on
   one shortcut with different sender faces both drew the shortcut's face. So
   **one shortcut per face**, never one per room.
3. **The shortcut can be removed 3s after posting** and the card keeps its
   face: Android caches a conversation's shortcut once a card uses it. So the
   real build leaves nothing in the launcher's long-press menu.
4. **The base eye stays as a badge** in the corner of the face. That is
   Samsung's and cannot be removed.

## 2. The native half

`modules/notification-face/`: a local Expo module, the `modules/power`
pattern, **with its own `android/build.gradle`** (the 2026-09-10 lesson).

**A receiver that outranks expo's own.** `expo-notifications` hands every
presentation to `findDesignatedBroadcastReceiver`, which takes the
highest-priority receiver for `expo.modules.notifications.NOTIFICATION_EVENT`
in this package. Expo's own is declared at priority −1. This module declares
`FaceNotificationsService : NotificationsService` at priority 10, overriding
only `getPresentationDelegate`. Its delegate overrides `createNotification`:
it calls `super`, and if the card's data names a face, it rebuilds the result
with `Notification.Builder.recoverBuilder` as a conversation card.

- `Person`: name is the card's title, icon is the face.
- `MessagingStyle(you).addMessage(body, now, her)`.
- `setShortcutId(id)` after `pushDynamicShortcut`, with a long-lived
  `ShortcutInfo` carrying the same `Person`. The shortcut opens the app's
  launch intent.
- Shortcut id: `face.<room>.<face>.<dark|light>`. **Revised 2026-10-19,
  in the plan:** the room is in it so that two rooms sharing a face never
  share a conversation title. Each is removed 3s after posting, and any
  `face.*` shortcut an earlier card left behind is swept before each push,
  in case the process died inside those three seconds.

**The face's picture** is the launcher face already in the APK, drawn to a
256px bitmap: `@mipmap/ic_launcher_<face>` dark, `ic_launcher_light_<face>`
light. No new assets. `withRotatingIcons` already generates both sets, and
it fails the prebuild if any is missing.

**Everything degrades to today's card.** No `face` in the data, a face with
no mipmap, Android older than 11, or any exception: `super`'s notification is
returned unchanged and the cause is logged. A card never fails to arrive over
its face.

**The dependency on `expo-notifications` is its published artifact**, since it
ships prebuilt (its `publication` in `expo-module.config.json`). The spike's
first build failed on `project(':expo-notifications')` for exactly this
reason. `build.gradle` reads the version from
`node_modules/expo-notifications/package.json` rather than hardcoding it, so an
upgrade cannot leave the two disagreeing.

**This subclasses a `protected` corner of a library**
(`ExpoPresentationDelegate.createNotification`). An expo-notifications upgrade
that changes it breaks the BUILD, loudly, not the cards silently. That is the
failure mode wanted.

## 3. The theme at delivery

The face is resolved when the card **arrives**, not when it is scheduled. So
a theme switch needs no rescheduling, and a card already scheduled 90 days
ahead still arrives in the right finish.

The module exposes one JS call, `setTheme(dark: boolean)`, which writes a
SharedPreferences value the receiver reads. The store calls it from `setTheme`
and at `hydrate`. It is not read from the per-app night mode: that is written
only on the background transition, and whether a receiver's process
configuration carries it is unverified. Never written means dark, matching
the app's default.

`src/core/notificationFace.ts` wraps it with `requireOptionalNativeModule`, the
`power.ts` rule: a build without the module is a no-op, never a throw at
import.

## 4. The JS half: which face a card asks for

Every card already carries `data.room`. It gains `data.face`, a waking
emotion key, written at scheduling time:

- **`DailyConfig` gains `face: WakingEmotion`**: `pleased` for advice,
  `alarmed` for horror, `calm` for both transmission slots. `makeDaily`
  writes it beside `room` and `index`.
- **Notes:** `Note` gains `face`, and `scheduleNote` writes `note.face`.

Cards already queued carry no face and arrive as today until their room
re-syncs. Advice and horror re-plan every day, transmissions on the next sync
or register change, and notes at the boot `reconcile`. So within a day,
everything carries one.

## 5. Notes: choosing a face

**Stored:** `Note.face`. **A missing or unknown face reads as `calm`**, a
deliberate exception to this file's drop-don't-default rule: every note
written before today has no face, and dropping them would delete every note
the subject has. A face, unlike an hour, has an honest default.

**The editor:** a FACE row under the weekdays. Eight dots, one per waking
state, each in its raw iris colour (an object, not type, so no
`emotionText`). The chosen one is ringed, and its label (`EMOTIONS[…].label`,
in her language) is set in `emotionText` beneath. New notes start on calm.

**The list:** each row carries a small dot in the note's iris colour.

Strings: `face` in the room's `strings.ts`, `FACE` / `표정`.

## 6. Testing

- **`npm test` covers the JS half:**
  - each room's cards carry their face;
  - a note's face is saved, reloaded, and written onto its card;
  - a note with no face, or an unknown one, loads as calm and is not dropped;
  - the picker sets and shows the face;
  - the list dot follows it;
  - `setTheme` and `hydrate` hand the theme to the native module;
  - an unlinked module is a no-op.
- **The device covers the native half, and nothing else can:**
  - each room's card collapsed and expanded;
  - a note in each of two faces;
  - both themes;
  - a card that arrives with the app open;
  - the launcher's long-press menu holding no shortcuts afterwards.

## 7. Out of scope

- Faces that change per card within a room (one advice card pleased,
  the next amused). Rooms have one face.
- The colour of the card, which is the system's.
- Removing the base-eye badge, which is Samsung's.
- A face for the dormant state. No card is sent by a dormant app, and the
  picker offers waking states only.

## 8. Spike cleanup

When this ships, the spike's worktree (`../vera-spike-notif-eye`) and branch
(`spike/notif-eye`) are deleted. Its receiver passes through anything without
a `probe` field, so the spike build on the phone is harmless until the real
build replaces it.
