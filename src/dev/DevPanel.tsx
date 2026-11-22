import { addMonths, addWeeks, format } from 'date-fns';
import { useState } from 'react';
import { View } from 'react-native';

import { useClockStore } from '@/core/clock/clock';
import { useToday } from '@/core/clock/useToday';
import { env } from '@/core/config/env';
import { useContentStore } from '@/core/content/content.store';
import { syncContent } from '@/core/content/contentSync';
import { localDemoProfiles, pickLocalDemoProfile } from '@/core/demo/localDemoProfiles';
import { useDocumentStatusStore } from '@/core/documents/documentStatus.store';
import { useProfileStore } from '@/core/profile/profile.store';
import { useAssistantMode, useSettingsStore } from '@/core/settings/settings.store';
import { resetAllData } from '@/core/storage/resetAll';
import { pl } from '@/shared/i18n/pl';
import { formatLongDate, formatTime } from '@/shared/lib/date';
import { Alert, AppText, Button, Card, DateField, Screen, SegmentedControl } from '@/shared/ui';

/** Ukryty panel deweloperski: „dzisiaj”, persona, tryb asystenta, synchronizacja treści, reset. */
export function DevPanel() {
  const today = useToday();
  const override = useClockStore((s) => s.overrideDate);
  const setOverride = useClockStore((s) => s.setOverrideDate);
  const assistantMode = useAssistantMode();
  const modeOverride = useSettingsStore((s) => s.assistantModeOverride);
  const setModeOverride = useSettingsStore((s) => s.setAssistantModeOverride);
  const content = useContentStore();
  const [message, setMessage] = useState<string | null>(null);
  const [pickedDate, setPickedDate] = useState<string | undefined>(undefined);

  const shift = (fn: (d: Date) => Date) => setOverride(format(fn(today), 'yyyy-MM-dd'));

  const loadDemoProfile = (profileId?: string) => {
    const picked = pickLocalDemoProfile(profileId);
    useProfileStore.getState().setDemoProfile(picked.profileId, picked.profile);
    setMessage(pl.dev.personaLoaded(picked.label));
  };

  return (
    <Screen>
      {message ? (
        <Alert tone="success">{message}</Alert>
      ) : null}

      <Card>
        <AppText variant="subheading">{pl.dev.today}</AppText>
        <AppText>{pl.dev.current(formatLongDate(today), override ? pl.dev.todayOverride : pl.dev.todayReal)}</AppText>
        <View className="flex-row flex-wrap gap-2">
          <Button compact variant="secondary" label={pl.dev.minusMonth} onPress={() => shift((d) => addMonths(d, -1))} />
          <Button compact variant="secondary" label={pl.dev.minusWeek} onPress={() => shift((d) => addWeeks(d, -1))} />
          <Button compact variant="secondary" label={pl.dev.plusWeek} onPress={() => shift((d) => addWeeks(d, 1))} />
          <Button compact variant="secondary" label={pl.dev.plusMonth} onPress={() => shift((d) => addMonths(d, 1))} />
        </View>
        <DateField label={pl.dev.setDate} value={pickedDate} onChange={setPickedDate} />
        <View className="flex-row flex-wrap gap-2">
          <Button compact label={pl.dev.setDate} disabled={!pickedDate} onPress={() => pickedDate && setOverride(pickedDate)} />
          <Button compact variant="ghost" label={pl.dev.resetDate} onPress={() => setOverride(null)} />
        </View>
      </Card>

      <Card>
        <AppText variant="subheading">{pl.dev.persona}</AppText>
        <Button label={pl.demo.random} icon="shuffle" onPress={() => loadDemoProfile()} />
        {localDemoProfiles().map((p) => (
          <Button
            key={p.profileId}
            variant="secondary"
            label={p.label}
            onPress={() => loadDemoProfile(p.profileId)}
          />
        ))}
      </Card>

      <Card>
        <AppText variant="subheading">{pl.dev.assistantMode}</AppText>
        <SegmentedControl
          value={modeOverride ?? 'env'}
          onChange={(v) => setModeOverride(v === 'env' ? null : v)}
          segments={[
            { value: 'env', label: `${pl.dev.envDefault} (${env.assistantMode})` },
            { value: 'mock', label: 'mock' },
            { value: 'remote', label: 'remote' },
          ]}
        />
        {assistantMode === 'remote' && !env.isSupabaseConfigured ? (
          <AppText variant="small" tone="warning">
            {pl.dev.remoteNeedsSupabase}
          </AppText>
        ) : null}
      </Card>

      <Card>
        <AppText variant="subheading">{pl.dev.contentSource}</AppText>
        <AppText>{pl.dev.sources[content.source]}</AppText>
        <AppText tone="muted">{pl.dev.contentVersion(content.bundle.version)}</AppText>
        <AppText tone="muted">{pl.dev.lastSync(content.lastSyncAt ? formatTime(content.lastSyncAt) : pl.dev.never)}</AppText>
        {content.syncError ? <AppText tone="danger">{pl.dev.syncError(content.syncError)}</AppText> : null}
        {env.isSupabaseConfigured ? (
          <Button label={pl.dev.syncNow} icon="sync-outline" loading={content.syncing} onPress={() => void syncContent({ force: true })} />
        ) : (
          <AppText variant="small" tone="warning">
            {pl.dev.supabaseMissing}
          </AppText>
        )}
      </Card>

      <Card>
        <Button
          variant="ghost"
          label={pl.dev.clearStatuses}
          onPress={() => {
            useDocumentStatusStore.getState().clearAll();
            setMessage(pl.dev.cleared);
          }}
        />
        <Button
          variant="danger"
          label={pl.dev.clearAll}
          onPress={() => {
            void resetAllData();
            setMessage(pl.dev.cleared);
          }}
        />
      </Card>
    </Screen>
  );
}

