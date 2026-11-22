import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { nowIso } from '@/core/clock/clock';
import { useToday } from '@/core/clock/useToday';
import { getDocumentInstances } from '@/core/content/selectors';
import { useDocumentStatusStore } from '@/core/documents/documentStatus.store';
import { useContentData } from '@/core/content/useContentData';
import { deadlineLabel, urgencyTone } from '@/core/content/format';
import { legal } from '@/core/legal/parameters';
import { goToDocument, goToSupport } from '@/core/navigation/routes';
import { exactAgeLabel, maskPesel, nextVaccination, vaccinationLabel } from '@/core/profile/childDetails';
import { isMultipleBirth } from '@/core/rules/buildFacts';
import { getChildColor } from '@/core/profile/childColors';
import { useProfileStore } from '@/core/profile/profile.store';
import { getStage } from '@/core/stage/getStage';
import { stageLabel } from '@/core/stage/stageLabel';
import type { Child } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { useIsDark } from '@/shared/theme';
import { AppText, Badge, Button, Card, ChildDot, EmptyState, Screen, ToggleRow } from '@/shared/ui';


import { MarkBornSheet } from './components/MarkBornSheet';

export function ChildEditScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useProfileStore((s) => s.profile?.children.find((c) => c.id === childId));
  if (!child) return <EmptyState title={pl.common.notFoundTitle} />;
  if (child.loss) return <LossDetails child={child} loss={child.loss} />;
  return <ChildDetails key={`${child.id}:${child.status}`} child={child} />;
}

/** Dziecko utracone (martwe urodzenie / zgon): spokojny widok bez wieku, szczepień i dokumentów o opiece nad dzieckiem. */
function LossDetails({ child, loss }: { child: Child; loss: NonNullable<Child['loss']> }) {
  const isDark = useIsDark();
  const t = pl.loss;
  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <ChildDot name={child.name} color={getChildColor(child.colorKey, isDark)} size={32} />
        <View className="flex-1">
          <AppText variant="title">{child.name}</AppText>
          <AppText variant="small" tone="muted">
            {t.label(loss.kind, isoToPolishDate(loss.date))}
          </AppText>
        </View>
      </View>
      <Card className="gap-3 p-5">
        <AppText variant="subheading" accessibilityRole="header">
          {t.title}
        </AppText>
        <AppText tone="muted">{t.body}</AppText>
      </Card>
      <Card className="gap-3 p-5">
        <AppText variant="subheading" accessibilityRole="header">
          {t.rightsTitle}
        </AppText>
        <AppText>• {t.maternity(legal().lossMaternityWeeks, legal().lossMinDaysAfterDeath)}</AppText>
        <AppText>• {t.funeral(formatMoney(legal().funeralGrant, 0))}</AppText>
        <Button
          label={pl.loss.openMaternity}
          variant="secondary"
          icon="document-text-outline"
          onPress={() => goToDocument('urlop-macierzynski', child.id)}
        />
      </Card>
      <Card tone="tinted" elevation={0} className="gap-3 p-5">
        <AppText>{t.support}</AppText>
        <Button label={t.supportOpen} icon="heart-outline" variant="secondary" onPress={() => goToSupport(loss.kind === 'stillbirth' ? 'miscarriage' : 'loss')} />
      </Card>
    </Screen>
  );
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
  const [showHidden, setShowHidden] = useState(false);
  const setStatus = useDocumentStatusStore((s) => s.setStatus);
  const born = child.status === 'born' && !!child.birthDate;
  const date = child.status === 'born' ? child.birthDate : child.dueDate;
  const vaccination = nextVaccination(child, today);
  const multiple = profile ? isMultipleBirth(profile, child) : false;
  const flags = [
    child.premature ? pl.profile.premature : null,
    child.disability ? pl.profile.disability : null,
    multiple ? pl.profile.multiple : null,
  ].filter((f) => f !== null) as string[];

  const instances = useMemo(
    () => (profile ? getDocumentInstances(bundle, profile, statuses, today, child.id).filter((d) => d.childId === child.id) : []),
    [bundle, profile, statuses, today, child.id],
  );
  const deadlines = useMemo(
    () =>
      instances
        .filter((d) => d.status === 'todo' && d.deadlineDate !== undefined)
        .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0))
        .slice(0, 3),
    [instances],
  );
  const hidden = useMemo(() => instances.filter((d) => d.status === 'hidden'), [instances]);

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
        <ToggleRow label={pl.profile.showHidden} hint={pl.profile.showHiddenHint(hidden.length)} value={showHidden} onChange={setShowHidden} />
        {showHidden && hidden.length > 0 ? (
          <View className="gap-2" accessibilityLabel={pl.profile.hiddenTitle}>
            {hidden.map((d) => (
              <View key={d.key} className="min-h-14 flex-row items-center gap-3 rounded-field border border-dashed border-base-300 bg-base-200 px-3 py-2">
                <Pressable
                  onPress={() => goToDocument(d.id, child.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.title}, ${pl.profile.hiddenBadge}`}
                  className="flex-1 gap-1 opacity-60 active:opacity-40">
                  <AppText variant="bodyStrong">{d.title}</AppText>
                  <Badge label={pl.profile.hiddenBadge} tone="neutral" icon="eye-off-outline" />
                </Pressable>
                <Button
                  compact
                  variant="ghost"
                  icon="arrow-undo-outline"
                  label={pl.documents.restore}
                  accessibilityLabel={`${pl.documents.restore}: ${d.title}`}
                  onPress={() => setStatus(d.key, 'todo', nowIso())}
                />
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {child.status === 'expected' ? <Button label={pl.profile.markBorn} icon="sparkles-outline" onPress={() => setMarkBorn(true)} /> : null}
      <MarkBornSheet child={markBorn ? child : null} onClose={() => setMarkBorn(false)} />
    </Screen>
  );
}
