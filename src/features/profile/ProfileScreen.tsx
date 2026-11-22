import Constants from 'expo-constants';
import { useRef, useState } from 'react';
import { Alert, Pressable } from 'react-native';

import { useToday } from '@/core/clock/useToday';
import { goToChildEdit, goToChildNew, goToDevPanel } from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import { useChildViews } from '@/core/profile/useChildViews';
import { resetAllData } from '@/core/storage/resetAll';
import type { Child } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, Card, Screen } from '@/shared/ui';

import { ChildRow } from './components/ChildRow';
import { FamilyAccountCard } from './components/FamilyAccountCard';
import { HouseholdCard } from './components/HouseholdCard';
import { MarkBornSheet } from './components/MarkBornSheet';
import { ParentCard } from './components/ParentCard';
import { ZusSection } from './components/ZusSection';

export function ProfileScreen() {
  const today = useToday();
  const profile = useProfileStore((s) => s.profile);
  const updateHousehold = useProfileStore((s) => s.updateHousehold);
  const children = useChildViews(today);
  const [markBornChild, setMarkBornChild] = useState<Child | null>(null);
  const taps = useRef<number[]>([]);

  if (!profile) return null;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const onVersionTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 3) {
      taps.current = [];
      goToDevPanel();
    }
  };

  const confirmReset = () =>
    Alert.alert(pl.profile.resetAll, pl.profile.resetAllBody, [
      { text: pl.common.cancel, style: 'cancel' },
      { text: pl.common.delete, style: 'destructive', onPress: () => void resetAllData() },
    ]);

  return (
    <Screen keyboard>
      <ParentCard title={pl.profile.me} parent={profile.me} />
      {profile.me.work ? <ZusSection work={profile.me.work} today={today} /> : null}
      <ParentCard title={pl.profile.partner} parent={profile.partner} emptyLabel={pl.profile.noPartner} />

      <Card>
        <AppText variant="subheading" accessibilityRole="header">
          {pl.profile.children}
        </AppText>
        {children.map((child) => (
          <ChildRow
            key={child.id}
            child={child}
            onPress={() => goToChildEdit(child.id)}
            onMarkBorn={() => setMarkBornChild(profile.children.find((c) => c.id === child.id) ?? null)}
          />
        ))}
        <Button label={pl.profile.addChild} variant="secondary" icon="add" onPress={goToChildNew} />
      </Card>

      <HouseholdCard profile={profile} onSave={updateHousehold} />
      <FamilyAccountCard profile={profile} />

      <AppText variant="small" tone="muted" className="text-center">
        {pl.profile.privacy}
      </AppText>
      <Button label={pl.profile.resetAll} variant="ghost" icon="trash-outline" onPress={confirmReset} />
      {__DEV__ ? <Button label={pl.profile.devPanel} variant="ghost" icon="construct-outline" onPress={goToDevPanel} /> : null}
      <Pressable onPress={onVersionTap} accessibilityRole="text" className="min-h-11 self-center p-3">
        <AppText variant="caption" tone="muted">
          {pl.profile.version(version)}
        </AppText>
      </Pressable>

      <MarkBornSheet child={markBornChild} onClose={() => setMarkBornChild(null)} />
    </Screen>
  );
}

