import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, View } from 'react-native';

import { useProfileStore } from '@/core/profile/profile.store';
import {
  OFFICIAL_SOURCES,
  organizationsFor,
  SITUATION_LABELS,
  situationsFromProfile,
  SupportSituationSchema,
  type SupportSituation,
} from '@/core/support/organizations';
import { isoToPolishDate } from '@/shared/lib/date';
import { openExternalLink } from '@/shared/lib/links';
import { useThemeColors } from '@/shared/theme';
import { AppText, Button, Card, Chip, IconBadge, Screen, SectionHeader } from '@/shared/ui';

const ALL = SupportSituationSchema.options;

/** Organizacje non-profit wspierające rodziców w trudnych sytuacjach + oficjalne źródła informacji (zadanie ZUS, pkt 3 i). */
export function SupportScreen() {
  const c = useThemeColors();
  const params = useLocalSearchParams<{ situation?: string }>();
  const children = useProfileStore((s) => s.profile?.children ?? []);
  const fromProfile = useMemo(() => situationsFromProfile(children), [children]);
  const initial = SupportSituationSchema.safeParse(params.situation);
  const [selected, setSelected] = useState<SupportSituation[]>(initial.success ? [initial.data] : fromProfile);
  const list = organizationsFor(selected);
  const toggle = (s: SupportSituation) => setSelected((x) => (x.includes(s) ? x.filter((y) => y !== s) : [...x, s]));

  return (
    <Screen>
      <Card tone="tinted" elevation={0} className="gap-3 p-5">
        <View className="flex-row items-center gap-3">
          <IconBadge icon="heart-outline" size={48} />
          <AppText variant="title" accessibilityRole="header" className="flex-1">
            Wsparcie w trudnej sytuacji
          </AppText>
        </View>
        <AppText>
          Fundacje i stowarzyszenia, które bezpłatnie pomagają rodzicom po stracie dziecka, po poronieniu, przy narodzinach wcześniaka albo ciężkiej chorobie dziecka.
          To organizacje pozarządowe – nie są częścią ZUS.
        </AppText>
        {fromProfile.length ? (
          <AppText variant="small" tone="muted">
            Wybraliśmy sytuacje na podstawie Twojego profilu. Możesz zmienić wybór.
          </AppText>
        ) : null}
      </Card>

      <View className="flex-row flex-wrap gap-2" accessibilityLabel="Sytuacja">
        {ALL.map((s) => (
          <Chip key={s} label={SITUATION_LABELS[s]} selected={selected.includes(s)} onPress={() => toggle(s)} />
        ))}
        {selected.length ? <Chip label="Pokaż wszystkie" onPress={() => setSelected([])} /> : null}
      </View>

      <View className="gap-3 md:flex-row md:flex-wrap">
        {list.map((o) => (
          <Card key={o.id} className="gap-2 p-5 md:min-w-80 md:flex-1">
            <AppText variant="heading">{o.name}</AppText>
            <AppText>{o.description}</AppText>
            <AppText variant="small" tone="muted">
              {o.situations.map((s) => SITUATION_LABELS[s]).join(' · ')} · {o.area}
            </AppText>
            {o.phone ? (
              <View className="flex-row items-center gap-2">
                <Ionicons name="call-outline" size={18} color={c.primary} />
                <AppText variant="bodyStrong" tone="primary" onPress={() => void Linking.openURL(`tel:${o.phone!.replace(/\s/g, '')}`)}>
                  {o.phone}
                </AppText>
                {o.phoneNote ? (
                  <AppText variant="small" tone="muted" className="flex-1">
                    {o.phoneNote}
                  </AppText>
                ) : null}
              </View>
            ) : null}
            <Button label="Otwórz stronę organizacji" icon="open-outline" variant="secondary" compact onPress={() => void openExternalLink(o.url)} />
            <AppText variant="caption" tone="muted">
              Adres sprawdzony {isoToPolishDate(o.verifiedAt)}
            </AppText>
          </Card>
        ))}
      </View>

      <SectionHeader title="Oficjalne informacje o uprawnieniach" />
      <Card className="gap-1 p-2">
        {OFFICIAL_SOURCES.map((s, i) => (
          <View key={s.id} className={`gap-1 p-3 ${i > 0 ? 'border-t border-base-300' : ''}`}>
            <AppText variant="bodyStrong">{s.name}</AppText>
            <AppText variant="small" tone="muted">
              {s.description}
            </AppText>
            <Button label="Przejdź do strony" icon="open-outline" variant="ghost" compact onPress={() => void openExternalLink(s.url)} className="self-start" />
          </View>
        ))}
      </Card>
      <AppText variant="small" tone="muted">
        W nagłym zagrożeniu życia dzwoń pod numer alarmowy 112.
      </AppText>
    </Screen>
  );
}
