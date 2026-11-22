import Ionicons from '@expo/vector-icons/Ionicons';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { type ComponentProps, type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  averageGross,
  contributionBreakdown,
  maskNip,
  maternityLeaveProgress,
  vacationDaysLeft,
} from '@/core/profile/work';
import type { Work, ZusRecord } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Badge, Card } from '@/shared/ui';

const t = pl.profile.zus;
type IconName = ComponentProps<typeof Ionicons>['name'];

function SectionCard({ icon, title, badge, children }: { icon: IconName; title: string; badge?: ReactNode; children: ReactNode }) {
  const c = useThemeColors();
  return (
    <Card>
      <View className="flex-row items-center gap-3">
        <View className="size-9 items-center justify-center rounded-field bg-primary-soft">
          <Ionicons name={icon} size={20} color={c.primary} />
        </View>
        <AppText variant="subheading" accessibilityRole="header" className="flex-1">
          {title}
        </AppText>
        {badge}
      </View>
      <View className="gap-1 pt-1">{children}</View>
    </Card>
  );
}

function Row({ label, value, strong = true, children }: { label: string; value?: string; strong?: boolean; children?: ReactNode }) {
  return (
    <View className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5" accessible={value !== undefined} accessibilityLabel={value !== undefined ? `${label}: ${value}` : undefined}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      {children ?? (
        <AppText variant={strong ? 'bodyStrong' : 'body'} className="shrink text-right">
          {value}
        </AppText>
      )}
    </View>
  );
}

function Progress({ ratio }: { ratio: number }) {
  return (
    <View className="h-2 overflow-hidden rounded-full bg-base-300" accessibilityRole="progressbar">
      <View className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }} />
    </View>
  );
}

function spanLabel(from: string, to?: string) {
  return t.period(isoToPolishDate(from), to ? isoToPolishDate(to) : undefined);
}

type TimelineItem =
  | { type: 'period'; from: string; to?: string; kind: ZusRecord['periods'][number]['kind']; fixedTerm: boolean }
  | { type: 'gap'; from: string; to: string; reason: ZusRecord['gaps'][number]['reason'] };

function Timeline({ zus }: { zus: ZusRecord }) {
  const items: TimelineItem[] = [
    ...zus.periods.map((p) => ({ type: 'period' as const, ...p })),
    ...zus.gaps.map((g) => ({ type: 'gap' as const, ...g })),
  ].sort((a, b) => b.from.localeCompare(a.from)); // najnowsze na górze
  return (
    <View className="pt-1">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const isGap = item.type === 'gap';
        const current = item.type === 'period' && !item.to;
        const days = isGap ? differenceInCalendarDays(parseISO(item.to), parseISO(item.from)) + 1 : 0;
        const label =
          item.type === 'period'
            ? `${t.employmentKind[item.kind]}, ${item.fixedTerm ? t.fixedTerm : t.indefinite}`
            : `${t.gap} – ${t.gapReason[item.reason]}`;
        return (
          <View key={`${item.type}-${item.from}`} className="flex-row gap-3" accessible accessibilityLabel={`${label}, ${spanLabel(item.from, item.to)}`}>
            <View className="w-4 items-center">
              <View className={`mt-1.5 size-3 rounded-full ${isGap ? 'bg-warning' : current ? 'bg-primary' : 'bg-base-300'}`} />
              {last ? null : <View className="w-0.5 flex-1 bg-base-300" />}
            </View>
            <View className="min-w-0 flex-1 pb-3">
              <View className="flex-row flex-wrap items-center gap-2">
                <AppText variant="bodyStrong" tone={isGap ? 'warning' : 'default'} className="shrink">
                  {label}
                </AppText>
                {current ? <Badge label={t.current} tone="success" /> : null}
              </View>
              <AppText variant="small" tone="muted">
                {spanLabel(item.from, item.to)}
                {isGap ? ` · ${t.gapDays(days)}` : ''}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PayerNip({ nip }: { nip: string }) {
  const c = useThemeColors();
  const [shown, setShown] = useState(false);
  return (
    <View className="flex-row items-center gap-2">
      <AppText variant="bodyStrong" selectable={shown}>
        {shown ? nip : maskNip(nip)}
      </AppText>
      <Pressable
        onPress={() => setShown((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={shown ? t.hideNipA11y : t.showNipA11y}
        className="min-h-11 justify-center px-1">
        <AppText variant="small" style={{ color: c.primary }}>
          {shown ? t.hideNip : t.showNip}
        </AppText>
      </Pressable>
    </View>
  );
}

function LeaveSummary({ work, today }: { work: Work; today: Date }) {
  const mat = work.maternityLeave ? maternityLeaveProgress(work.maternityLeave, today) : undefined;
  return (
    <View className="gap-3 pb-1">
      {work.maternityLeave && mat ? (
        <View className="gap-1.5 rounded-field bg-primary-soft p-3" accessible accessibilityLabel={`${t.maternity}: ${t.maternityLeft(mat.daysLeft)}`}>
          <View className="flex-row items-center justify-between gap-2">
            <AppText variant="bodyStrong">{t.maternity}</AppText>
            <Badge
              label={mat.status === 'upcoming' ? t.maternityUpcoming : mat.status === 'finished' ? t.maternityFinished : t.maternityLeft(mat.daysLeft)}
              tone={mat.status === 'ongoing' ? 'success' : 'neutral'}
              icon="hourglass-outline"
            />
          </View>
          <Progress ratio={mat.elapsedDays / mat.totalDays} />
          <AppText variant="small" tone="muted">
            {spanLabel(work.maternityLeave.startDate, work.maternityLeave.endDate)}
            {mat.status === 'ongoing' ? ` · ${t.maternityProgress(mat.elapsedDays, mat.totalDays)}` : ''}
          </AppText>
        </View>
      ) : null}
      {work.parentalLeave ? (
        <View className="gap-1.5">
          <View className="flex-row items-baseline justify-between gap-2">
            <AppText variant="small" tone="muted">
              {t.parental}
            </AppText>
            <AppText variant="bodyStrong">{t.parentalLeft(work.parentalLeave.weeksTotal - work.parentalLeave.weeksUsed, work.parentalLeave.weeksTotal)}</AppText>
          </View>
          <Progress ratio={work.parentalLeave.weeksUsed / work.parentalLeave.weeksTotal} />
        </View>
      ) : null}
      <View className="gap-1.5">
        <View className="flex-row items-baseline justify-between gap-2">
          <AppText variant="small" tone="muted">
            {t.vacation}
          </AppText>
          <AppText variant="bodyStrong">{t.vacationLeft(vacationDaysLeft(work), work.vacation.entitlementDays)}</AppText>
        </View>
        <Progress ratio={work.vacation.usedDays / Math.max(1, work.vacation.entitlementDays)} />
      </View>
    </View>
  );
}

/** Dane rodzica z (symulowanego) PUE/eZUS – ubezpieczenie, zatrudnienie, składki, płatnik, świadczenia i urlopy. */
export function ZusSection({ work, today }: { work: Work; today: Date }) {
  const c = useThemeColors();
  const [monthsOpen, setMonthsOpen] = useState(false);
  const zus = work.zus;
  const avg = averageGross(work);
  const breakdown = zus ? contributionBreakdown(zus.contributionBase) : undefined;

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2 px-1">
        <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
        <AppText variant="heading" accessibilityRole="header" className="flex-1">
          {t.title}
        </AppText>
        <Badge label={t.simulated} tone="warning" icon="flask-outline" />
      </View>

      {zus ? (
        <SectionCard
          icon="medkit-outline"
          title={t.sectionInsurance}
          badge={<Badge label={t.kind[zus.sickness.kind]} tone={zus.sickness.insured ? 'success' : 'neutral'} icon="checkmark-circle-outline" />}>
          <AppText variant="bodyStrong" tone={zus.sickness.insured ? 'success' : 'danger'}>
            {zus.sickness.insured ? t.insured : t.notInsured}
          </AppText>
          <Row label={t.since} value={isoToPolishDate(zus.sickness.since)} />
          <Row label={t.until} value={zus.sickness.until ? isoToPolishDate(zus.sickness.until) : t.ongoing} />
          <Row label={t.titleCode} value={t.titleCodeValue(zus.sickness.titleCode)} />
        </SectionCard>
      ) : null}

      {zus ? (
        <SectionCard icon="briefcase-outline" title={t.sectionEmployment}>
          <Timeline zus={zus} />
        </SectionCard>
      ) : null}

      <SectionCard icon="cash-outline" title={t.sectionEarnings}>
        <Row label={t.grossMonthly} value={t.money(work.monthlyGross)} />
        {work.monthlyNet !== undefined ? <Row label={t.netMonthly} value={t.money(work.monthlyNet)} /> : null}
        {zus && breakdown ? (
          <>
            <Row label={t.contributionBase} value={t.money(zus.contributionBase)} />
            <Row label={t.healthBase} value={t.money(breakdown.healthBase)} />
            <Row label={`${t.contributions}: ${t.pension.toLowerCase()}`} value={t.money(breakdown.pension)} strong={false} />
            <Row label={`${t.contributions}: ${t.disability.toLowerCase()}`} value={t.money(breakdown.disability)} strong={false} />
            <Row label={`${t.contributions}: ${t.sickness.toLowerCase()}`} value={t.money(breakdown.sickness)} strong={false} />
            <Row label={`${t.contributions}: ${t.health.toLowerCase()}`} value={t.money(breakdown.health)} strong={false} />
          </>
        ) : null}
        {avg !== undefined ? <Row label={`${t.average} (${work.earnings.length} mies.)`} value={t.money(avg)} /> : null}
        {work.earnings.length > 0 ? (
          <>
            <Pressable
              onPress={() => setMonthsOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: monthsOpen }}
              className="min-h-11 flex-row items-center gap-1 self-start">
              <AppText variant="small" style={{ color: c.primary }}>
                {monthsOpen ? t.hideMonths : t.showMonths}
              </AppText>
              <Ionicons name={monthsOpen ? 'chevron-up' : 'chevron-down'} size={16} color={c.primary} />
            </Pressable>
            {monthsOpen ? (
              <View>
                <AppText variant="caption" tone="muted">
                  {t.lastMonths}
                </AppText>
                {[...work.earnings].reverse().map((m) => (
                  <Row key={m.month} label={m.month} value={t.money(m.gross)} strong={false} />
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </SectionCard>

      {zus ? (
        <SectionCard icon="business-outline" title={t.sectionPayer}>
          <Row label={t.payerName} value={zus.payer.name} />
          <Row label={t.payerNip}>
            <PayerNip nip={zus.payer.nip} />
          </Row>
          <Row label={t.payerRegon} value={zus.payer.regon} />
          <Row label={t.payerCity} value={zus.payer.city} />
          <Row label={t.payerInsured} value={String(work.employerInsuredCount)} />
          <Row label={t.payerPaysBenefits} value={zus.payer.paysBenefits ? t.payerPaysYes : t.payerPaysNo} />
        </SectionCard>
      ) : null}

      {zus ? (
        <SectionCard icon="receipt-outline" title={t.sectionArrears}>
          {zus.arrears.amount > 0 ? (
            <Alert tone="error" title={t.arrearsAmount(t.money(zus.arrears.amount))}>
              {t.arrearsChecked(isoToPolishDate(zus.arrears.checkedAt))}
            </Alert>
          ) : (
            <Alert tone="success" title={t.noArrears}>
              {t.arrearsChecked(isoToPolishDate(zus.arrears.checkedAt))}
            </Alert>
          )}
        </SectionCard>
      ) : null}

      {zus ? (
        <SectionCard icon="time-outline" title={t.sectionBenefits}>
          {zus.benefitHistory.length === 0 ? <AppText tone="muted">{t.noBenefits}</AppText> : null}
          {zus.benefitHistory.map((b) => (
            <Row key={`${b.kind}-${b.from}`} label={t.benefitKind[b.kind]} value={`${spanLabel(b.from, b.to)} · ${t.days(b.days)}`} />
          ))}
        </SectionCard>
      ) : null}

      <SectionCard icon="calendar-outline" title={t.sectionLeaves}>
        <LeaveSummary work={work} today={today} />
        {zus && zus.leaveHistory.length > 0 ? (
          <View>
            <AppText variant="caption" tone="muted">
              {t.usedLeaves}
            </AppText>
            {zus.leaveHistory.map((l) => (
              <Row key={`${l.kind}-${l.from}`} label={t.leaveKind[l.kind]} value={`${spanLabel(l.from, l.to)} · ${t.days(l.days)}`} />
            ))}
          </View>
        ) : null}
      </SectionCard>
    </View>
  );
}
