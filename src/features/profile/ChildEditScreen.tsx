import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useToday } from '@/core/clock/useToday';
import { getDocumentInstances } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { deadlineLabel, urgencyTone } from '@/core/content/format';
import { goToDocument } from '@/core/navigation/routes';
import { exactAgeLabel, maskPesel, nextVaccination, vaccinationLabel } from '@/core/profile/childDetails';
import { isMultipleBirth } from '@/core/rules/buildFacts';
import { getChildColor } from '@/core/profile/childColors';
import { useProfileStore } from '@/core/profile/profile.store';
import { getStage } from '@/core/stage/getStage';
import { stageLabel } from '@/core/stage/stageLabel';
import type { Child } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { useIsDark } from '@/shared/theme';
import { AppText, Badge, Button, ChildDot, EmptyState, Screen } from '@/shared/ui';


import { MarkBornSheet } from './components/MarkBornSheet';

export function ChildEditScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useProfileStore((s) => s.profile?.children.find((c) => c.id === childId));
  if (!child) return <EmptyState title={pl.common.notFoundTitle} />;
  return <ChildDetails key={`${child.id}:${child.status}`} child={child} />;
}

function insuranceText(insured: Child['insured']) {
  if (insured === undefined) return pl.profile.insuranceUnknown;
  return insured ? pl.profile.insured : pl.profile.notInsured;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-0.5">
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      {children}
    </View>
  );
}

/** Podgląd dziecka – dane są tylko do odczytu (pochodzą z mObywatela / onboardingu). */
function ChildDetails({ child }: { child: Child }) {
  const today = useToday();
  const isDark = useIsDark();
  const { bundle, profile, statuses } = useContentData();
  const [markBorn, setMarkBorn] = useState(false);
  const [showPesel, setShowPesel] = useState(false);
  const born = child.status === 'born' && !!child.birthDate;
  const date = child.status === 'born' ? child.birthDate : child.dueDate;
  const vaccination = nextVaccination(child, today);
  const multiple = profile ? isMultipleBirth(profile, child) : false;
  const flags = [
    child.premature ? pl.profile.premature : null,
    child.disability ? pl.profile.disability : null,
    multiple ? pl.profile.multiple : null,
  ].filter((f) => f !== null) as string[];

  const deadlines = useMemo(
    () =>
      profile
        ? getDocumentInstances(bundle, profile, statuses, today, child.id)
            .filter((d) => d.status === 'todo' && d.deadlineDate !== undefined)
            .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
            .slice(0, 3)
        : [],
    [bundle, profile, statuses, today, child.id],
  );

  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <ChildDot name={child.name} color={getChildColor(child.colorKey, isDark)} size={32} />
        <View className="flex-1">
          <AppText variant="title">{child.name}</AppText>
          <AppText variant="small" tone="muted">
            {stageLabel(getStage(child, today))}
          </AppText>
        </View>
      </View>
      <View className="gap-3 rounded-field border border-base-300 bg-base-200 p-4">
        <Field label={child.status === 'born' ? pl.childForm.birthDate : pl.childForm.dueDate}>
          <AppText variant="bodyStrong">{isoToPolishDate(date)}</AppText>
        </Field>
        {born ? (
          <Field label={pl.profile.ageLabel}>
            <AppText variant="bodyStrong">{exactAgeLabel(child.birthDate as string, today)}</AppText>
          </Field>
        ) : null}
        <Field label={pl.profile.insuranceLabel}>
          <AppText variant="bodyStrong">{insuranceText(child.insured)}</AppText>
        </Field>
        <Field label={pl.profile.peselLabel}>
          {child.pesel ? (
            <View className="min-h-11 flex-row items-center justify-between gap-3">
              <AppText variant="bodyStrong" selectable={showPesel}>
                {showPesel ? child.pesel : maskPesel(child.pesel)}
              </AppText>
              <Pressable
                onPress={() => setShowPesel((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={showPesel ? pl.profile.peselHideA11y : pl.profile.peselShowA11y}
                className="min-h-11 justify-center px-2">
                <AppText variant="bodyStrong" tone="primary">
                  {showPesel ? pl.profile.peselHide : pl.profile.peselShow}
                </AppText>
              </Pressable>
            </View>
          ) : (
            <AppText variant="bodyStrong">{pl.profile.noData}</AppText>
          )}
        </Field>
        {born ? (
          <Field label={pl.profile.birthRegistryLabel}>
            <AppText variant="bodyStrong">
              {child.birthRegistry ? `${child.birthRegistry.actNumber}, ${child.birthRegistry.office}` : pl.profile.noData}
            </AppText>
          </Field>
        ) : null}
        {born ? (
          <Field label={pl.profile.nextVaccinationLabel}>
            <AppText variant="bodyStrong">{vaccination ? vaccinationLabel(vaccination) : pl.profile.noVaccinations}</AppText>
          </Field>
        ) : null}
        {flags.length > 0 ? (
          <Field label={pl.profile.flagsLabel}>
            <View className="flex-row flex-wrap gap-2">
              {flags.map((f) => (
                <Badge key={f} label={f} tone="info" />
              ))}
            </View>
          </Field>
        ) : null}
      </View>

      <View className="gap-2">
        <AppText variant="heading" accessibilityRole="header">
          {pl.profile.deadlinesTitle}
        </AppText>
        {deadlines.length === 0 ? (
          <AppText tone="muted">{pl.profile.noDeadlines}</AppText>
        ) : (
          deadlines.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => goToDocument(d.id, child.id)}
              accessibilityRole="button"
              accessibilityLabel={d.title}
              className="min-h-14 flex-row items-center justify-between gap-3 rounded-field border border-base-300 bg-base-200 px-3 py-2 active:opacity-80">
              <AppText variant="bodyStrong" className="flex-1">
                {d.title}
              </AppText>
              <Badge label={deadlineLabel(d.daysLeft, d.deadlineDate)} tone={urgencyTone(d.urgency)} />
            </Pressable>
          ))
        )}
      </View>

      {child.status === 'expected' ? <Button label={pl.profile.markBorn} icon="sparkles-outline" onPress={() => setMarkBorn(true)} /> : null}
      <MarkBornSheet child={markBorn ? child : null} onClose={() => setMarkBorn(false)} />
    </Screen>
  );
}
