import Ionicons from '@expo/vector-icons/Ionicons';
import { differenceInCalendarDays } from 'date-fns';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { env } from '@/core/config/env';
import { goToOnboardingStep } from '@/core/navigation/routes';
import { averageGross, maternityLeaveProgress, vacationDaysLeft } from '@/core/profile/work';
import { pl } from '@/shared/i18n/pl';
import { fromISODate, isoToPolishDate } from '@/shared/lib/date';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Button, Card, Screen, Sheet } from '@/shared/ui';

import { mockMObywatelService, type MObywatelData } from '../mobywatel/mObywatelService';
import { useOnboardingDraft } from '../onboardingDraft.store';
import { SQLiteDemoLogin } from './SQLiteDemoLogin';

type Phase = 'idle' | 'signing' | 'confirm' | 'error';

const t = pl.onboarding.login;

/** Krok 0: (symulowane) logowanie przez mObywatel → pobranie danych rodzica → „czy się zgadza?”. */
export function StepLogin() {
  return env.demoApiUrl ? <SQLiteDemoLogin /> : <MockLogin />;
}

function MockLogin() {
  const c = useThemeColors();
  const apply = useOnboardingDraft((s) => s.applyMObywatelData);
  const [phase, setPhase] = useState<Phase>('idle');
  const [identity, setIdentity] = useState<MObywatelData | null>(null);
  const abort = useRef<AbortController | null>(null);

  const signIn = async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhase('signing');
    try {
      const result = await mockMObywatelService.signIn(ctrl.signal);
      if (ctrl.signal.aborted) return;
      setIdentity(result);
      setPhase('confirm');
    } catch {
      if (!ctrl.signal.aborted) setPhase('error');
    }
  };

  const cancel = () => {
    abort.current?.abort();
    setPhase('idle');
  };

  const confirm = () => {
    if (identity) apply(identity);
    setPhase('idle');
    goToOnboardingStep('partner');
  };

  const rows: [string, string][] = identity
    ? [
        [t.firstName, identity.identity.firstName],
        [t.lastName, identity.identity.lastName],
        [t.birthDate, isoToPolishDate(identity.identity.birthDate)],
        [t.gender, pl.gender[identity.identity.gender]],
        [t.city, identity.identity.city],
      ]
    : [];
  const kids = identity?.children ?? [];
  const today = new Date();
  const pue = identity?.pue;
  const pueRows: [string, string][] = [];
  if (pue) {
    const w = pue.work;
    const avg = averageGross(w);
    pueRows.push(
      ...(w.zus ? ([[t.pueEmployer, w.zus.payer.name]] as [string, string][]) : []),
      [t.pueStatus, t.pueStatusValue],
      [t.pueEmployedSince, isoToPolishDate(w.employedSince)],
      [t.pueInsuredCount, String(w.employerInsuredCount)],
      [t.pueMonthlyGross, t.pueMoney(w.monthlyGross)],
    );
    if (avg !== undefined) pueRows.push([t.pueAverage, t.pueMoney(avg)]);
    pueRows.push([t.pueBenefitPayer, t.pueBenefitPayerValue[w.benefitPayer]]);
    if (w.maternityLeave) {
      const p = maternityLeaveProgress(w.maternityLeave, today);
      const range = t.pueMaternityRange(isoToPolishDate(w.maternityLeave.startDate), isoToPolishDate(w.maternityLeave.endDate));
      const left =
        p.status === 'upcoming' ? t.pueMaternityUpcoming : p.status === 'finished' ? t.pueMaternityFinished : t.pueMaternityLeft(p.daysLeft, Math.ceil(p.daysLeft / 7));
      pueRows.push([t.pueMaternity, `${range}\n${left}`]);
    }
    if (w.parentalLeave) pueRows.push([t.pueParental, t.pueParentalValue(w.parentalLeave.weeksTotal - w.parentalLeave.weeksUsed)]);
    pueRows.push([t.pueVacation, t.pueVacationValue(vacationDaysLeft(w), w.vacation.entitlementDays)]);
  }

  return (
    <Screen>
      <Card className="w-full gap-5 self-center p-5 md:max-w-4xl md:p-6">
        <View className="gap-2">
          <AppText variant="title" accessibilityRole="header">
            {t.title}
          </AppText>
          <AppText tone="muted">{t.intro}</AppText>
        </View>

        <Pressable
          onPress={() => void signIn()}
          disabled={phase === 'signing'}
          accessibilityRole="button"
          accessibilityLabel={t.signIn}
          accessibilityHint={t.scanHint}
          accessibilityState={{
            disabled: phase === 'signing',
            busy: phase === 'signing',
          }}
          className="min-h-24 flex-row items-center gap-4 rounded-box border border-base-300 bg-base-200 p-4 active:opacity-80">
          <View className="size-12 shrink-0 items-center justify-center rounded-field bg-primary-soft">
            <Ionicons name="phone-portrait-outline" size={26} color={c.primary} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <AppText variant="subheading">{t.appTitle}</AppText>
              <View className="rounded-selector bg-primary-soft px-2 py-1">
                <AppText variant="caption" tone="primary">
                  {t.recommended}
                </AppText>
              </View>
            </View>
            <AppText tone="muted">{t.scanHint}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={c.primary} />
        </Pressable>

        {phase === 'error' ? <Alert tone="error">{t.signInError}</Alert> : null}
        <Alert tone="warning" title={t.simulationTitle} icon="flask-outline">
          {t.simulationBody}
        </Alert>
      </Card>

      {/* Pasek ładowania i pytanie o zgodność danych – jako „modal” DaisyUI. */}
      <Sheet
        visible={phase === 'signing'}
        onClose={cancel}
        title={t.signingIn}
        footer={<Button label={pl.common.cancel} variant="ghost" onPress={cancel} />}>
        <View className="items-center py-6" accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Sheet>

      <Sheet visible={phase === 'confirm'} onClose={() => setPhase('idle')} title={t.confirmTitle} footer={<></>}>
        <AppText tone="muted">{t.confirmIntro}</AppText>
        <Card>
          {rows.map(([label, value]) => (
            <View
              key={label}
              className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5"
              accessible
              accessibilityLabel={`${label}: ${value}`}>
              <AppText variant="small" tone="muted">
                {label}
              </AppText>
              <AppText variant="bodyStrong" className="shrink">
                {value}
              </AppText>
            </View>
          ))}
        </Card>
        {kids.length > 0 ? (
          <Card>
            <AppText variant="subheading" accessibilityRole="header">
              {t.childrenTitle}
            </AppText>
            {kids.map((k) => {
              const days = Math.max(0, differenceInCalendarDays(today, fromISODate(k.birthDate)));
              const detail = `${isoToPolishDate(k.birthDate)} · ${t.ageDays(days)}`;
              return (
                <View
                  key={`${k.firstName}-${k.birthDate}`}
                  className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5"
                  accessible
                  accessibilityLabel={`${k.firstName}: ${detail}`}>
                  <AppText variant="bodyStrong">{k.firstName}</AppText>
                  <AppText variant="small" tone="muted" className="shrink">
                    {detail}
                  </AppText>
                </View>
              );
            })}
          </Card>
        ) : (
          <Alert tone="info">{t.noChildren}</Alert>
        )}
        {pueRows.length > 0 ? (
          <Card>
            <AppText variant="subheading" accessibilityRole="header">
              {t.pueTitle}
            </AppText>
            {pueRows.map(([label, value]) => (
              <View
                key={label}
                className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5"
                accessible
                accessibilityLabel={`${label}: ${value.replace('\n', ', ')}`}>
                <AppText variant="small" tone="muted">
                  {label}
                </AppText>
                <AppText variant="bodyStrong" className="shrink text-right">
                  {value}
                </AppText>
              </View>
            ))}
          </Card>
        ) : null}
        <Alert tone="info">{t.storageNote}</Alert>
        <Button label={t.confirmYes} icon="checkmark" onPress={confirm} />
        <Button label={t.confirmNo} variant="ghost" onPress={() => setPhase('idle')} />
      </Sheet>
    </Screen>
  );
}
