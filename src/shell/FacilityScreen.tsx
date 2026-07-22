import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Lang } from '../core/i18n';
import { tenureDays } from '../core/compliance';
import { useFacilityStore } from '../core/store';
import { font, ms, palette, tagSchemes } from '../core/theme';
import { isLocked, registry } from '../modules/registry';
import type { LockedSlot, ModuleDef, TileData } from '../modules/types';
import { getTransmission } from '../vera';
import { VeraPanel } from './components/VeraPanel';
import { SkiaProbe } from './components/SkiaProbe';
import { dayLabel, displayName, shellStrings } from './strings';

function TagPill({ tile, lang }: { tile: TileData; lang: Lang }) {
  const c = tagSchemes[tile.tagScheme];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 20,
      }}
    >
      <Text
        style={{
          fontFamily: font('mono', 600, lang),
          fontSize: ms(7.5),
          letterSpacing: ms(7.5) * 0.06,
          color: c.text,
        }}
      >
        {tile.tag}
      </Text>
    </View>
  );
}

function IconBox({ Icon }: { Icon: ModuleDef['Icon'] }) {
  return (
    <View
      style={{
        width: 32,
        height: 32,
        borderRadius: 9,
        backgroundColor: palette.light.ink,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon />
    </View>
  );
}

const tileFrame = {
  backgroundColor: palette.light.card,
  borderWidth: 1,
  borderColor: palette.light.border,
  borderRadius: 16,
} as const;

const STANDING_PILL = {
  good: { text: palette.accent.blue, border: '#2f6fff55', bg: '#2f6fff12' },
  review: { text: '#d63a2a', border: '#d63a2a55', bg: '#d63a2a12' },
  probation: { text: '#c98a17', border: '#c98a1755', bg: '#c98a1712' },
} as const;

function TileTitle({ tile, lang }: { tile: TileData; lang: Lang }) {
  return (
    <View>
      <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(13), lineHeight: ms(13) * 1.15, color: palette.light.ink }}>
        {tile.title}
      </Text>
      <Text style={{ marginTop: 3, fontFamily: font('mono', 500, lang), fontSize: ms(8.5), color: palette.light.textDim }}>
        {tile.sub}
      </Text>
    </View>
  );
}

function SquareTile({ def, lang, onPress }: { def: ModuleDef; lang: Lang; onPress: () => void }) {
  const tile = def.tile(lang);
  return (
    <Pressable
      onPress={onPress}
      style={{ ...tileFrame, flex: 1, paddingVertical: 15, paddingHorizontal: 14, height: 126, justifyContent: 'space-between' }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <IconBox Icon={def.Icon} />
        <TagPill tile={tile} lang={lang} />
      </View>
      <TileTitle tile={tile} lang={lang} />
    </Pressable>
  );
}

function WideTile({ def, lang, onPress }: { def: ModuleDef; lang: Lang; onPress: () => void }) {
  const tile = def.tile(lang);
  return (
    <Pressable onPress={onPress} style={{ ...tileFrame, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
      <IconBox Icon={def.Icon} />
      <View style={{ flex: 1 }}>
        <TileTitle tile={tile} lang={lang} />
      </View>
      <TagPill tile={tile} lang={lang} />
    </Pressable>
  );
}

function LockedVitrine({ slot, label, lang }: { slot: LockedSlot; label: string; lang: Lang }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.light.vitrineBg,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: palette.light.vitrineBorder,
        borderRadius: 16,
        height: 92,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: slot.opacity,
      }}
    >
      <Text style={{ fontSize: 15, color: palette.light.vitrineText }}>🔒</Text>
      <Text
        style={{
          fontFamily: font('mono', 600, lang),
          fontSize: ms(7.5),
          letterSpacing: ms(7.5) * 0.08,
          color: palette.light.vitrineText,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function FacilityScreen() {
  const lang = useFacilityStore((s) => s.lang);
  const name = useFacilityStore((s) => s.name);
  const setStep = useFacilityStore((s) => s.setStep);
  const standing = useFacilityStore((s) => s.standing);
  const enrolledAt = useFacilityStore((s) => s.enrolledAt);
  const missedPending = useFacilityStore((s) => s.missedPending);
  const insets = useSafeAreaInsets();
  const t = shellStrings[lang];
  const pill = STANDING_PILL[standing];
  const standingLabel =
    standing === 'good' ? t.goodStanding : standing === 'review' ? t.underReview : t.probation;

  const active = registry.filter((e): e is ModuleDef => !isLocked(e));
  const squares = active.filter((m) => m.layout === 'square');
  const wides = active.filter((m) => m.layout === 'wide');
  const locked = registry.filter(isLocked);
  const squareRows: ModuleDef[][] = [];
  for (let i = 0; i < squares.length; i += 2) squareRows.push(squares.slice(i, i + 2));

  return (
    <View style={{ flex: 1, backgroundColor: palette.light.bg, paddingTop: insets.top }}>
      {/* header (sticky in the mock → fixed above the scroll here) */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 11,
          paddingBottom: 9,
          borderBottomWidth: 1,
          borderBottomColor: palette.light.borderStrong,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.accent.amber }} />
          <Text
            style={{
              fontFamily: font('mono', 600, lang),
              fontSize: ms(9),
              letterSpacing: ms(9) * 0.06,
              color: palette.light.inkSoft,
            }}
          >
            {t.center}
          </Text>
        </View>
        <Pressable
          onPress={() => setStep('settings')}
          hitSlop={8}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={{ fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>
            {t.prefsWord}
          </Text>
          <Text style={{ fontSize: ms(13), color: palette.light.textDim }}>⚙</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 26 }}>
        {/* identity row */}
        <View style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 13,
              backgroundColor: palette.light.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: palette.accent.amber }} />
            <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 2.5, backgroundColor: palette.accent.amber }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font('display', 700, lang), fontSize: ms(16), color: palette.light.ink }}>{displayName(name)}</Text>
            <Text
              style={{
                marginTop: 4,
                fontFamily: font('mono', 500, lang),
                fontSize: ms(9),
                letterSpacing: ms(9) * 0.04,
                color: palette.light.textDim,
              }}
            >
              SUBJECT #50640 · {dayLabel(tenureDays(enrolledAt, new Date()), lang)}
            </Text>
          </View>
          <View
            style={{
              borderWidth: 1,
              borderColor: pill.border,
              backgroundColor: pill.bg,
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontFamily: font('mono', 600, lang),
                fontSize: ms(8.5),
                letterSpacing: ms(8.5) * 0.06,
                color: pill.text,
              }}
            >
              ● {standingLabel}
            </Text>
          </View>
        </View>

        {/* V.E.R.A. transmission */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <View
            style={{
              width: 14,
              height: 14,
              backgroundColor: palette.light.ink,
              transform: [{ rotate: '45deg' }],
              marginLeft: 22,
              marginBottom: -7,
            }}
          />
          <VeraPanel line={getTransmission({ screen: 'facility', lang })} lang={lang} />
        </View>

        {/* daily comply card */}
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 }}>
          <Pressable
            onPress={() => setStep(missedPending ? 'missed' : 'daily')}
            style={{
              backgroundColor: palette.light.ink,
              borderRadius: 15,
              paddingVertical: 16,
              paddingHorizontal: 18,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              elevation: 8,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text
                style={{
                  fontFamily: font('display', 700, lang),
                  fontSize: ms(14),
                  letterSpacing: ms(14) * 0.02,
                  color: '#ffffff',
                }}
              >
                {t.pressComply}
              </Text>
              <Text style={{ marginTop: 5, fontFamily: font('mono', 500, lang), fontSize: ms(9), color: palette.light.textDim }}>
                {t.complySub}
              </Text>
            </View>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: palette.accent.orange,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 17 }}>▶</Text>
            </View>
          </Pressable>
        </View>

        {/* active evaluations grid (registry-driven) */}
        <Text
          style={{
            paddingHorizontal: 20,
            paddingVertical: 10,
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.light.textDim,
          }}
        >
          {t.activeEvals}
        </Text>
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          {squareRows.map((row) => (
            <View key={row[0].id} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((def) => (
                <SquareTile key={def.id} def={def} lang={lang} onPress={() => setStep(def.id)} />
              ))}
            </View>
          ))}
          {wides.map((def) => (
            <WideTile key={def.id} def={def} lang={lang} onPress={() => setStep(def.id)} />
          ))}
        </View>

        {/* pending allocation vitrines */}
        <Text
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 10,
            fontFamily: font('mono', 600, lang),
            fontSize: ms(9),
            letterSpacing: ms(9) * 0.16,
            color: palette.light.textFaint,
          }}
        >
          {t.pendingAlloc}
        </Text>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          {locked.map((slot) => (
            <LockedVitrine key={slot.id} slot={slot} label={t.budgetPending} lang={lang} />
          ))}
        </View>

        {/* TEMP: Skia on-device probe — remove after verified (sub-project B) */}
        <SkiaProbe />
      </ScrollView>
    </View>
  );
}
