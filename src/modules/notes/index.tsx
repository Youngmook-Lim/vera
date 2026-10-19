import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFacilityStore } from '../../core/store';
import { PALETTES, emotionText, font, ms, serif, themed } from '../../core/theme';
import { EMOTIONS } from '../../vera/emotions';
import type { ModuleDef } from '../types';
import { DISPLAY_ORDER } from './schedule';
import { NoteEditor } from './NoteEditor';
import { onTap, readTapTarget } from './notify';
import type { Note } from './stored';
import { useNotesStore } from './store';
import { T } from './strings';

const GRID_TILE_PX = 86; // the cabinet's grid cell, shared by every slot

const pad = (v: number) => String(v).padStart(2, '0');

function NotesTile({ onPress }: { onPress: () => void }) {
  const tileStyles = TileStylesSheets[useFacilityStore((st) => st.theme)];
  const lang = useFacilityStore((s) => s.lang);
  return (
    // The slot numeral sits above the title, not centred with it (4a).
    <Pressable testID="tile-mod03" style={tileStyles.tile} onPress={onPress}>
      <Text style={[tileStyles.slot, { fontFamily: font('mono', 500, lang) }]}>03</Text>
      <Text style={[tileStyles.title, { fontFamily: serif(lang) }]}>{T[lang].label}</Text>
    </Pressable>
  );
}

// The doorway rule (spec §4): the one exit, top-left, fixed at 44px, drawn in
// this room's own ink — never the shell's amber.
function ExitAndLabel({ onBack }: { onBack?: () => void }) {
  const styles = S[useFacilityStore((st) => st.theme)];
  const lang = useFacilityStore((s) => s.lang);
  const setView = useFacilityStore((s) => s.setView);
  return (
    <View style={styles.headerLeft}>
      <Pressable
        testID={onBack ? 'notes-card-back' : 'module-exit'}
        onPress={() => (onBack ? onBack() : setView('stage'))}
        style={styles.exit}
      >
        <Text style={[styles.exitGlyph, { fontFamily: font('mono', 500, lang) }]}>‹</Text>
      </Pressable>
      <Text testID="notes-label" style={[styles.label, { fontFamily: font('mono', 500, lang) }]}>
        {T[lang].label}
      </Text>
    </View>
  );
}

function daysLabel(note: Note, lang: 'en' | 'ko'): string {
  return DISPLAY_ORDER.filter((d) => note.days.includes(d))
    .map((d) => T[lang].dayNames[d])
    .join(' ');
}

function NotesScreen() {
  const theme = useFacilityStore((st) => st.theme);
  const styles = S[theme];
  const p = PALETTES[theme];
  const insets = useSafeAreaInsets();
  const lang = useFacilityStore((s) => s.lang);
  const emotion = useFacilityStore((s) => s.emotion);
  const pendingNote = useFacilityStore((s) => s.pendingNote);
  const notes = useNotesStore((s) => s.notes);
  const setEnabled = useNotesStore((s) => s.setEnabled);
  const hydrate = useNotesStore((s) => s.hydrate);
  const t = T[lang];

  // The room is in her building, so it is lit in whatever she is wearing —
  // the same as both other rooms, and for the same reasons set out there.
  const accent = emotionText(EMOTIONS[emotion].iris, theme);

  const [editing, setEditing] = useState<Note | null | undefined>(undefined);
  const [card, setCard] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // A note a notification asked for. Taken once and cleared, so walking back
  // into the room later shows the list. A note deleted between the
  // notification firing and the tap leaves `card` pointing at nothing, which
  // falls through to the list rather than to an empty card.
  useEffect(() => {
    if (pendingNote == null) return;
    setCard(pendingNote);
    setEditing(undefined);
    useFacilityStore.setState({ pendingNote: null });
  }, [pendingNote]);

  const shown = card != null ? notes.find((n) => n.id === card) : undefined;

  if (shown) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <ExitAndLabel onBack={() => setCard(null)} />
        </View>
        {/* Set in serif for the reason the advice cards are: it is a sentence
            worth reading, and it is the subject's own, handed back at the hour
            they asked for it. */}
        <View testID="notes-card" style={styles.cardWrap}>
          <Text style={[styles.cardText, { fontFamily: serif(lang) }]}>{shown.text}</Text>
        </View>
      </View>
    );
  }

  if (editing !== undefined) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <ExitAndLabel onBack={() => setEditing(undefined)} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <NoteEditor
            note={editing ?? undefined}
            accent={accent}
            onDone={() => setEditing(undefined)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      testID="view-mod03"
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <ExitAndLabel />
      </View>

      <ScrollView testID="notes-list" contentContainerStyle={styles.list}>
        {notes.length === 0 ? (
          <Text style={[styles.empty, { fontFamily: font('mono', 500, lang) }]}>{t.empty}</Text>
        ) : null}

        {notes.map((note) => (
          <Pressable
            key={note.id}
            testID={`notes-row-${note.id}`}
            style={styles.row}
            onPress={() => setEditing(note)}
          >
            <View style={styles.rowText}>
              <View style={styles.rowHead}>
                <Text
                  style={[
                    styles.rowTime,
                    {
                      fontFamily: font('mono', 600, lang),
                      color: note.enabled ? accent : p.notes.inkDim,
                    },
                  ]}
                >
                  {`${pad(note.hour)}:${pad(note.minute)}`}
                </Text>
                {/* The face this note's cards wear, in its raw iris: an object,
                    not type. */}
                <View
                  testID={`notes-row-${note.id}-face`}
                  style={[styles.faceDot, { backgroundColor: EMOTIONS[note.face].iris }]}
                />
              </View>
              <Text
                testID={`notes-row-${note.id}-days`}
                style={[styles.rowDays, { fontFamily: font('mono', 500, lang) }]}
              >
                {daysLabel(note, lang)}
              </Text>
              <Text
                style={[
                  styles.rowBody,
                  { fontFamily: serif(lang), color: note.enabled ? p.notes.ink : p.notes.inkDim },
                ]}
                numberOfLines={2}
              >
                {note.text}
              </Text>
            </View>

            {/* A nested Pressable, which takes the touch itself, so switching
                a note off never opens it. */}
            <Pressable
              testID={`notes-row-${note.id}-switch`}
              accessibilityRole="switch"
              accessibilityState={{ selected: note.enabled }}
              hitSlop={12}
              onPress={() => void setEnabled(note.id, !note.enabled)}
            >
              <Text style={[styles.switch, { color: note.enabled ? accent : p.notes.inkGhost }]}>
                {note.enabled ? '●' : '○'}
              </Text>
            </Pressable>
          </Pressable>
        ))}

        <Pressable testID="notes-new" style={styles.newRow} onPress={() => setEditing(null)}>
          <Text
            testID="notes-new-text"
            style={[styles.newText, { fontFamily: font('mono', 500, lang), color: accent }]}
          >
            {t.newNote}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export const notes: ModuleDef = {
  id: 'mod03',
  slot: '03',
  Tile: NotesTile,
  Screen: NotesScreen,
  // No Settings row: every note carries its own switch where the subject can
  // see it, and a master switch on another screen would be a second place to
  // look and a second thing to disagree with.
  onBoot: async () => {
    await useNotesStore.getState().hydrate();
    // Idempotent, and what lets a queue that has drifted put itself right.
    void useNotesStore.getState().reconcileAll();

    const tapped = await readTapTarget();
    if (tapped != null) useFacilityStore.getState().openNote(tapped);

    return onTap((id) => useFacilityStore.getState().openNote(id));
  },
};

const TileStylesSheets = themed((p) => StyleSheet.create({
  tile: {
    width: GRID_TILE_PX,
    height: GRID_TILE_PX,
    flex: 1,
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    backgroundColor: p.notes.card,
    borderWidth: 1,
    borderColor: p.notes.cardBorder,
  },
  slot: { fontSize: ms(7), letterSpacing: ms(7) * 0.2, color: p.notes.inkDim },
  title: { fontSize: ms(11), color: p.notes.ink },
}));

const S = themed((p) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: p.notes.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: p.notes.rule,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exit: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  exitGlyph: { fontSize: ms(13), color: p.notes.inkSoft },
  label: { fontSize: ms(8), letterSpacing: ms(8) * 0.2, color: p.notes.inkSoft },
  list: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 30 },
  empty: { fontSize: ms(8.5), color: p.notes.inkGhost, paddingVertical: 26 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderColor: p.notes.rule,
  },
  rowText: { flex: 1 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  faceDot: { width: 7, height: 7, borderRadius: 3.5 },
  rowTime: { fontSize: ms(15), letterSpacing: ms(15) * 0.04 },
  rowDays: { marginTop: 3, fontSize: ms(7.5), letterSpacing: ms(7.5) * 0.3, color: p.notes.inkDim },
  rowBody: { marginTop: 6, fontSize: ms(12) },
  switch: { fontSize: ms(12) },
  newRow: { paddingVertical: 18, borderTopWidth: 1, borderColor: p.notes.rule },
  newText: { fontSize: ms(8.5), letterSpacing: ms(8.5) * 0.16 },
  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  cardText: { fontSize: ms(24), lineHeight: ms(24) * 1.35, color: p.notes.ink, textAlign: 'center' },
}));
