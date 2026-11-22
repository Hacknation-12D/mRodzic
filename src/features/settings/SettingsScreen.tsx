import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goToProfile } from '@/core/navigation/routes';
import { useSettingsStore } from '@/core/settings/settings.store';
import { resetAllData } from '@/core/storage/resetAll';
import { pl } from '@/shared/i18n/pl';
import { ActionTile, AppText, Button, Card, Screen, SectionHeader, SegmentedControl } from '@/shared/ui';

type ThemeChoice = 'system' | 'light' | 'dark';
const t = pl.settings;

/** Ustawienia: wygląd, konto, dane na urządzeniu, wersja aplikacji. */
export function SettingsScreen() {
  const themeOverride = useSettingsStore((s) => s.themeOverride);
  const setThemeOverride = useSettingsStore((s) => s.setThemeOverride);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen>
      <SectionHeader title={t.appearance} />
      <Card className="gap-3 p-5">
        <SegmentedControl<ThemeChoice>
          accessibilityLabel={t.appearance}
          value={themeOverride ?? 'system'}
          onChange={(v) => setThemeOverride(v === 'system' ? null : v)}
          segments={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t.theme[v] }))}
        />
        <AppText variant="small" tone="muted">
          {t.appearanceHint}
        </AppText>
      </Card>

      <SectionHeader title={t.account} />
      <ActionTile icon="person-circle-outline" title={pl.accountMenu.profile} description={t.profileBody} onPress={goToProfile} />

      <SectionHeader title={t.data} subtitle={t.dataBody} />
      <Card className="gap-3 p-5">
        {confirmDelete ? (
          <View className="gap-3">
            <AppText variant="subheading">{t.deleteAllConfirm}</AppText>
            <AppText tone="muted">{t.deleteAllBody}</AppText>
            <View className="flex-row gap-3">
              <Button variant="ghost" label={pl.common.cancel} onPress={() => setConfirmDelete(false)} className="flex-1" />
              <Button
                variant="danger"
                icon="trash-outline"
                label={pl.common.delete}
                className="flex-1"
                onPress={() => {
                  void resetAllData();
                  router.replace('/onboarding');
                }}
              />
            </View>
          </View>
        ) : (
          <Button variant="ghost" icon="trash-outline" label={t.deleteAll} onPress={() => setConfirmDelete(true)} />
        )}
      </Card>

      <AppText variant="small" tone="muted" className="text-center">
        {t.about} · {pl.profile.version(version)}
      </AppText>
    </Screen>
  );
}
