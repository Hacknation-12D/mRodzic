import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  BenefitInputError,
  calculatePregnancyScenario,
  legal,
  type JobLossReason,
  type PregnancyScenarioInput,
  type PregnancyScenarioResult,
  type SicknessInsurance,
} from '@/core/benefits';
import { offlineSnapshot } from '@/core/demo/DemoDataProvider';
import { useLegalRevision } from '@/core/legal/legal.store';
import { useProfileStore } from '@/core/profile/profile.store';
import type { Employment, Profile } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { formatMoney, formatPercent, parseAmount } from '@/shared/lib/money';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Button, Card, DateField, IconBadge, SectionHeader, SegmentedControl, Select, StatTile, Stepper, TextField, ToggleRow } from '@/shared/ui';

import { t } from '../strings';

const s = t.pregnancySick;
const EMPLOYMENTS: Employment[] = ['employment_contract', 'self_employed', 'civil_contract', 'student', 'unemployed', 'other'];
const JOB_LOSS: JobLossReason[] = ['liquidation', 'bankruptcy', 'employer_death', 'unlawful_termination'];

/** Dane startowe z profilu: PUE/eZUS (ubezpieczenie, wynagrodzenia), e-ZLA z symulowanego konta, termin porodu. */
function defaults(profile: Profile | null, demoId: string | null): PregnancyScenarioInput {
  const me = profile?.me;
  const work = me?.work;
  const zus = work?.zus;
  const employment = me?.employment ?? 'employment_contract';
  const earnings = work?.earnings ?? [];
  const gross = earnings.length ? earnings.reduce((n, e) => n + e.gross, 0) / earnings.length : (work?.monthlyGross ?? zus?.contributionBase ?? 0);
  let periods: PregnancyScenarioInput['periods'] = [];
  if (demoId && /^P\d{2}$/.test(demoId)) {
    try {
      periods = offlineSnapshot(demoId).ezla.map((r) => ({ from: r.from, to: r.to, pregnancy: r.code.includes('B') }));
    } catch {
      periods = [];
    }
  }
  const end = zus?.sickness;
  const art30 = end && !end.insured && end.until && end.endReason && end.endReason !== 'other' ? { date: end.until, reason: end.endReason } : undefined;
  return {
    employment,
    sicknessInsurance: zus ? (zus.sickness.insured ? 'yes' : 'no') : employment === 'employment_contract' ? 'yes' : 'unknown',
    insuranceSince: zus?.sickness.since,
    waitingException: false,
    averageMonthlyGross: Math.round(gross * 100) / 100,
    birthYear: me?.birthDate ? Number(me.birthDate.slice(0, 4)) : undefined,
    employerDaysUsedBefore: 0,
    periods,
    dueDate: profile?.children.find((c) => c.status === 'expected')?.dueDate,
    jobLoss: art30,
  };
}

type Outcome = { result: PregnancyScenarioResult; error?: undefined } | { result?: undefined; error: BenefitInputError };

/** Kalkulator świadczeń w ciąży: zwolnienie (e-ZLA), okres wyczekiwania, 270 dni, rehabilitacyjne, zasiłek po utracie pracy. */
export function PregnancyCalculator() {
  const profile = useProfileStore((st) => st.profile);
  const demoId = useProfileStore((st) => st.demoProfileId);
  const revision = useLegalRevision();
  const c = useThemeColors();
  const start = useMemo(() => defaults(profile, demoId), [profile, demoId]);
  const [input, setInput] = useState<PregnancyScenarioInput>(start);
  const [grossText, setGrossText] = useState(start.averageMonthlyGross ? String(start.averageMonthlyGross).replace('.', ',') : '');
  const patch = (x: Partial<PregnancyScenarioInput>) => setInput((prev) => ({ ...prev, ...x }));
  const gross = parseAmount(grossText);
  const voluntary = input.employment === 'self_employed' || input.employment === 'civil_contract';

  const outcome: Outcome = useMemo(() => {
    try {
      return { result: calculatePregnancyScenario({ ...input, averageMonthlyGross: Number.isFinite(gross) ? gross : 0, periods: input.periods.filter((x) => x.from && x.to) }) };
    } catch (e) {
      if (e instanceof BenefitInputError) return { error: e };
      throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision: przelicz po zmianie parametrów w panelu
  }, [input, gross, revision]);
  const result = outcome.result;
  const status = result?.eligibility.status ?? 'unknown';
  const tone = status === 'eligible' ? 'success' : status === 'not_eligible' ? 'error' : 'warning';
  const icon = status === 'eligible' ? 'checkmark-circle' : status === 'not_eligible' ? 'close-circle' : 'help-circle';

  const setPeriod = (i: number, x: Partial<PregnancyScenarioInput['periods'][number]>) =>
    patch({ periods: input.periods.map((p, n) => (n === i ? { ...p, ...x } : p)) });

  return (
    <View className="gap-4 md:flex-row md:items-start">
      <View className="gap-3 md:w-[44%]">
        <SectionHeader title={s.inputsTitle} />
        <Card className="gap-4 p-5">
          <Select label={t.employment} value={input.employment} options={EMPLOYMENTS.map((e) => ({ value: e, label: pl.employment[e] }))} onChange={(v) => v && patch({ employment: v })} />
          {voluntary ? (
            <SegmentedControl<SicknessInsurance>
              accessibilityLabel={t.sickness}
              segments={(['yes', 'no', 'unknown'] as const).map((v) => ({ value: v, label: t.sicknessOptions[v] }))}
              value={input.sicknessInsurance}
              onChange={(v) => patch({ sicknessInsurance: v })}
            />
          ) : null}
          <TextField
            label={voluntary ? t.grossVoluntary : t.grossEmployee}
            value={grossText}
            onChangeText={setGrossText}
            keyboardType="decimal-pad"
            inputMode="decimal"
            error={outcome.error?.field === 'averageMonthlyGross' ? outcome.error.message : undefined}
          />
          <DateField label={s.insuranceSince} value={input.insuranceSince} onChange={(v) => patch({ insuranceSince: v })} />
          <ToggleRow label={s.waitingException} hint={s.waitingExceptionHint} value={input.waitingException} onChange={(v) => patch({ waitingException: v })} />
          {input.employment === 'employment_contract' ? (
            <>
              <TextField
                label={s.birthYear}
                value={input.birthYear ? String(input.birthYear) : ''}
                onChangeText={(v) => patch({ birthYear: Number(v.replace(/\D/g, '').slice(0, 4)) || undefined })}
                keyboardType="number-pad"
                inputMode="numeric"
              />
              <Stepper label={s.employerDaysUsed} value={input.employerDaysUsedBefore} min={0} max={33} onChange={(n) => patch({ employerDaysUsedBefore: n })} />
            </>
          ) : null}

          <View className="h-px bg-base-300" />
          <AppText variant="bodyStrong">{s.periodsTitle}</AppText>
          {start.periods.length ? (
            <AppText variant="small" tone="muted">
              {s.periodsFromZus}
            </AppText>
          ) : null}
          {input.periods.map((p, i) => (
            <View key={i} className="gap-2 rounded-field border border-base-300 p-3">
              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-40 flex-1">
                  <DateField label={s.from} value={p.from} onChange={(v) => setPeriod(i, { from: v ?? '' })} />
                </View>
                <View className="min-w-40 flex-1">
                  <DateField label={s.to} value={p.to} onChange={(v) => setPeriod(i, { to: v ?? '' })} />
                </View>
              </View>
              <ToggleRow label={s.codeB} value={p.pregnancy} onChange={(v) => setPeriod(i, { pregnancy: v })} />
              <Button label={s.removePeriod} variant="ghost" compact icon="trash-outline" onPress={() => patch({ periods: input.periods.filter((_, n) => n !== i) })} />
            </View>
          ))}
          <Button label={s.addPeriod} variant="secondary" icon="add" onPress={() => patch({ periods: [...input.periods, { from: '', to: '', pregnancy: true }] })} />

          <View className="h-px bg-base-300" />
          <DateField label={s.dueDate} value={input.dueDate} onChange={(v) => patch({ dueDate: v })} error={outcome.error?.field === 'dueDate' ? outcome.error.message : undefined} />
          <ToggleRow label={s.jobLoss} value={Boolean(input.jobLoss)} onChange={(v) => patch({ jobLoss: v ? { date: input.dueDate ?? '', reason: 'liquidation' } : undefined })} />
          {input.jobLoss ? (
            <View className="gap-3 border-l-2 border-base-300 pl-3">
              <DateField label={s.jobLossDate} value={input.jobLoss.date} onChange={(v) => patch({ jobLoss: { ...input.jobLoss!, date: v ?? '' } })} />
              <Select
                label={s.jobLossReason}
                value={input.jobLoss.reason}
                options={JOB_LOSS.map((r) => ({ value: r, label: s.jobLossReasons[r] }))}
                onChange={(v) => v && patch({ jobLoss: { ...input.jobLoss!, reason: v } })}
              />
            </View>
          ) : null}
        </Card>
      </View>

      <View className="gap-4 md:flex-1" accessibilityLiveRegion="polite">
        {outcome.error ? (
          <Alert tone="warning" title={t.fixInputs}>
            {outcome.error.message}
          </Alert>
        ) : null}
        {result ? (
          <>
            <Card elevation={2} className="gap-3 p-5">
              <View className="flex-row items-center gap-3">
                <IconBadge icon={icon} tone={tone} size={48} />
                <AppText variant="subheading" className="flex-1" accessibilityRole="header">
                  {s.status[status]}
                </AppText>
              </View>
              {[...result.eligibility.reasons, ...result.eligibility.missing].map((r) => (
                <AppText key={r}>• {r}</AppText>
              ))}
              {result.eligibility.warnings.length ? (
                <View className="gap-2 rounded-field bg-warning-soft p-3">
                  <AppText variant="bodyStrong" tone="warning">
                    {t.warningsTitle}
                  </AppText>
                  {result.eligibility.warnings.map((w) => (
                    <AppText key={w}>• {w}</AppText>
                  ))}
                </View>
              ) : null}
              {result.eligibility.alternatives.map((a) => (
                <AppText key={a} tone="muted">
                  → {a}
                </AppText>
              ))}
            </Card>

            {result.sickness ? (
              <>
                <View className="flex-row flex-wrap gap-3">
                  <StatTile emphasis label={t.total} value={formatMoney(result.sickness.totals.totalAmount, 0)} hint={`${result.sickness.totals.employerDays + result.sickness.totals.zusDays} dni`} />
                  {result.base ? <StatTile label={t.howBase} value={formatMoney(result.base, 0)} hint={formatMoney(result.base / 30) + ' / dzień'} /> : null}
                </View>
                <Card className="gap-1 p-5">
                  <AppText variant="heading" className="mb-2">
                    {t.breakdownTitle}
                  </AppText>
                  {result.sickness.segments.map((seg, i) => (
                    <View key={i} className="flex-row items-start justify-between gap-3 border-b border-base-300 py-3">
                      <View className="min-w-0 flex-1 gap-0.5">
                        <AppText variant="bodyStrong">{seg.payer === 'employer' ? s.employer : seg.payer === 'zus' ? s.zus : '—'}</AppText>
                        <AppText variant="small" tone="muted">
                          {isoToPolishDate(seg.from)} – {isoToPolishDate(seg.to)} · {seg.days} dni · {t.rateDaily(formatPercent(seg.rate), formatMoney(seg.dailyAmount))}
                        </AppText>
                      </View>
                      <AppText variant="bodyStrong">{formatMoney(seg.amount)}</AppText>
                    </View>
                  ))}
                  {result.waitingEnds ? (
                    <AppText variant="small" tone="muted" className="pt-2">
                      {s.waitingFrom(isoToPolishDate(result.waitingEnds))}
                    </AppText>
                  ) : null}
                  {result.remainingDays !== undefined ? (
                    <AppText variant="small" tone="muted">
                      {s.remaining(result.remainingDays, legal().pregnancySicknessPeriodDays)}
                    </AppText>
                  ) : null}
                  {result.sickness.notes.map((n) => (
                    <AppText key={n} variant="small" tone="muted">
                      • {n}
                    </AppText>
                  ))}
                </Card>
              </>
            ) : null}

            {result.maternityLevel ? (
              <Card className="gap-2 p-5">
                <AppText variant="heading">{s.maternityLevelTitle}</AppText>
                <AppText>{result.maternityLevel.reason}</AppText>
                <AppText tone="muted">
                  {s.maternityLevelPeriod(isoToPolishDate(result.maternityLevel.from), isoToPolishDate(result.maternityLevel.to), result.maternityLevel.days)} ·{' '}
                  {formatMoney(result.maternityLevel.dailyAmount)} dziennie
                </AppText>
                <AppText variant="heading" tone="primary">
                  {formatMoney(result.maternityLevel.amount)}
                </AppText>
              </Card>
            ) : null}

            <Card className={result.rehabilitation.applies ? 'gap-2 bg-warning-soft p-5' : 'gap-2 p-5'}>
              <View className="flex-row items-center gap-2">
                <Ionicons name="medkit-outline" size={20} color={c.primary} />
                <AppText variant="heading">{s.rehabTitle}</AppText>
              </View>
              <AppText>{result.rehabilitation.text}</AppText>
            </Card>
            <Card className="gap-2 p-5">
              <AppText variant="heading">{t.whereTitle}</AppText>
              <AppText>{s.where}</AppText>
            </Card>
          </>
        ) : null}
        <AppText variant="small" tone="muted" className="px-1">
          {t.disclaimer}
        </AppText>
      </View>
    </View>
  );
}
