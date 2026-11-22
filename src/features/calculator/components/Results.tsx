import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { legal, type BenefitScenarioResult, type Eligibility } from '@/core/benefits';
import { isoToPolishDate } from '@/shared/lib/date';
import { formatMoney, formatPercent } from '@/shared/lib/money';
import { useThemeColors } from '@/shared/theme';
import { AppText, Card, ChoiceTile, IconBadge, StatTile, type IconTone } from '@/shared/ui';

import { t } from '../strings';

const STATUS: Record<Eligibility['status'], { icon: 'checkmark-circle' | 'close-circle' | 'help-circle'; tone: IconTone }> = {
  eligible: { icon: 'checkmark-circle', tone: 'success' },
  not_eligible: { icon: 'close-circle', tone: 'error' },
  unknown: { icon: 'help-circle', tone: 'warning' },
};

function Bullets({ items, icon, color }: { items: string[]; icon: 'ellipse' | 'alert-circle-outline' | 'arrow-forward-circle-outline'; color: string }) {
  return (
    <View className="gap-2">
      {items.map((item) => (
        <View key={item} className="flex-row gap-2">
          <Ionicons name={icon} size={icon === 'ellipse' ? 6 : 16} color={color} style={{ marginTop: icon === 'ellipse' ? 8 : 2 }} />
          <AppText className="flex-1">{item}</AppText>
        </View>
      ))}
    </View>
  );
}

/** Wynik oceny prawa do zasiłku – zawsze z uzasadnieniem. */
export function EligibilityCard({ eligibility }: { eligibility: Eligibility }) {
  const c = useThemeColors();
  const s = STATUS[eligibility.status];
  return (
    <Card elevation={2} className="gap-4 p-5">
      <View className="flex-row items-center gap-3">
        <IconBadge icon={s.icon} tone={s.tone} size={48} />
        <AppText variant="subheading" className="flex-1" accessibilityRole="header">
          {t.status[eligibility.status]}
        </AppText>
      </View>
      {eligibility.reasons.length ? <Bullets items={eligibility.reasons} icon="ellipse" color={c.baseContentMuted} /> : null}
      {eligibility.missing.length ? (
        <View className="gap-2 rounded-field bg-warning-soft p-3">
          <AppText variant="bodyStrong" tone="warning">
            {t.missingTitle}
          </AppText>
          <Bullets items={eligibility.missing} icon="arrow-forward-circle-outline" color={c.warning} />
        </View>
      ) : null}
      {eligibility.warnings.length ? (
        <View className="gap-2 rounded-field bg-warning-soft p-3">
          <AppText variant="bodyStrong" tone="warning">
            {t.warningsTitle}
          </AppText>
          <Bullets items={eligibility.warnings} icon="alert-circle-outline" color={c.warning} />
        </View>
      ) : null}
      {eligibility.alternatives.length ? (
        <View className="gap-2 rounded-field bg-info-soft p-3">
          <AppText variant="bodyStrong">{t.alternativesTitle}</AppText>
          <Bullets items={eligibility.alternatives} icon="arrow-forward-circle-outline" color={c.baseContent} />
        </View>
      ) : null}
    </Card>
  );
}

/** Najważniejsze liczby: kwota miesięczna (pierwszy okres) i suma. */
export function SummaryStats({ result }: { result: BenefitScenarioResult }) {
  const amounts = result.amounts;
  if (!amounts) return null;
  const first = amounts.segments[0];
  const weeks = amounts.segments.reduce((acc, s) => acc + s.weeks, 0);
  return (
    <View className="flex-row flex-wrap gap-3">
      <StatTile emphasis label={t.monthly} value={formatMoney(first.monthlyAmount, 0)} hint={t.monthlyHint(first.label)} />
      <StatTile label={t.total} value={formatMoney(amounts.totalAmount, 0)} hint={t.totalHint(t.weeks(weeks))} />
    </View>
  );
}

function BetterTag({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View className="self-start rounded-selector bg-success-soft px-2 py-0.5">
      <AppText variant="caption" tone="success">
        {t.better}
      </AppText>
    </View>
  );
}

/** Wybór wariantu wniosku: 81,5% vs 100% + 70% – z kwotami obu. */
export function VariantCard({ result, upfront, onChange }: { result: BenefitScenarioResult; upfront: boolean; onChange: (upfront: boolean) => void }) {
  const cmp = result.amounts?.variantComparison;
  if (!cmp) return null;
  const upfrontBetter = cmp.difference >= 0;
  return (
    <Card className="gap-3 p-5">
      <View className="gap-1">
        <AppText variant="heading" accessibilityRole="header">
          {t.variantsTitle}
        </AppText>
        <AppText variant="small" tone="muted">
          {t.variantsBody}
        </AppText>
      </View>
      {result.upfrontDeadline ? (
        <View className={result.upfrontDeadlinePassed ? 'rounded-field bg-warning-soft p-3' : 'rounded-field bg-base-200 p-3'}>
          <AppText variant="small" tone={result.upfrontDeadlinePassed ? 'warning' : 'default'}>
            {result.upfrontDeadlinePassed ? t.upfrontDeadlinePassed(isoToPolishDate(result.upfrontDeadline)) : t.upfrontDeadline(isoToPolishDate(result.upfrontDeadline))}
          </AppText>
        </View>
      ) : null}
      <View className="gap-3 md:flex-row">
        <ChoiceTile className="md:flex-1" title={t.upfront.title} description={t.upfront.body} selected={upfront} onPress={() => onChange(true)}>
          <AppText variant="heading">{formatMoney(cmp.upfrontTotal, 0)}</AppText>
          <BetterTag show={upfrontBetter && cmp.difference !== 0} />
        </ChoiceTile>
        <ChoiceTile className="md:flex-1" title={t.separate.title} description={t.separate.body} selected={!upfront} onPress={() => onChange(false)}>
          <AppText variant="heading">{formatMoney(cmp.separateTotal, 0)}</AppText>
          <BetterTag show={!upfrontBetter} />
        </ChoiceTile>
      </View>
      {cmp.difference !== 0 ? (
        <AppText variant="small" tone="muted">
          {t.difference(formatMoney(Math.abs(cmp.difference)))}
        </AppText>
      ) : null}
    </Card>
  );
}

/** Kwoty za każdy okres. */
export function BreakdownCard({ result }: { result: BenefitScenarioResult }) {
  const amounts = result.amounts;
  if (!amounts) return null;
  return (
    <Card className="gap-1 p-5">
      <AppText variant="heading" accessibilityRole="header" className="mb-2">
        {t.breakdownTitle}
      </AppText>
      {amounts.segments.map((s) => (
        <View key={s.leave} className="flex-row items-start justify-between gap-3 border-b border-base-300 py-3" accessible>
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText variant="bodyStrong">{s.label}</AppText>
            <AppText variant="small" tone="muted">
              {t.weeks(s.weeks)} · {t.rateDaily(formatPercent(s.rate), formatMoney(s.dailyAmount))}
            </AppText>
          </View>
          <View className="items-end gap-0.5">
            <AppText variant="bodyStrong">{formatMoney(s.amount)}</AppText>
            <AppText variant="small" tone="muted">
              {formatMoney(s.monthlyAmount)} / mies.
            </AppText>
          </View>
        </View>
      ))}
      <View className="flex-row items-center justify-between pt-3">
        <AppText variant="subheading">{t.total}</AppText>
        <AppText variant="heading" tone="primary">
          {formatMoney(amounts.totalAmount)}
        </AppText>
      </View>
    </Card>
  );
}

/** Oś czasu urlopów obojga rodziców. */
export function TimelineCard({ result }: { result: BenefitScenarioResult }) {
  const c = useThemeColors();
  return (
    <Card className="gap-1 p-5">
      <AppText variant="heading" accessibilityRole="header" className="mb-3">
        {t.timelineTitle}
      </AppText>
      {result.periods.map((p, i) => {
        const last = i === result.periods.length - 1;
        const color = p.who === 'me' ? c.primary : c.baseContentMuted;
        return (
          <View key={`${p.kind}-${p.startDate}`} className="flex-row gap-3" accessible accessibilityLabel={`${p.label}: ${isoToPolishDate(p.startDate)} – ${isoToPolishDate(p.endDate)}`}>
            <View className="items-center" style={{ width: 16 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: color, marginTop: 3 }} />
              {!last ? <View style={{ width: 2, flex: 1, backgroundColor: c.base300, marginVertical: 2 }} /> : null}
            </View>
            <View className="min-w-0 flex-1 gap-1 pb-4">
              <View className="flex-row flex-wrap items-center gap-2">
                <AppText variant="bodyStrong">{p.label}</AppText>
                <View className={p.who === 'me' ? 'rounded-selector bg-primary-soft px-2 py-0.5' : 'rounded-selector bg-neutral-soft px-2 py-0.5'}>
                  <AppText variant="caption" tone={p.who === 'me' ? 'primary' : 'muted'}>
                    {p.who === 'me' ? t.you : t.partner}
                  </AppText>
                </View>
              </View>
              <AppText variant="small" tone="muted">
                {isoToPolishDate(p.startDate)} – {isoToPolishDate(p.endDate)} · {t.weeks(p.weeks)}
              </AppText>
            </View>
          </View>
        );
      })}
      {result.paternity ? (
        <View className="flex-row items-center gap-2 rounded-field bg-base-200 p-3">
          <Ionicons name="man-outline" size={18} color={c.baseContentMuted} />
          <AppText variant="small" className="flex-1">
            {t.paternity(result.paternity.weeks, isoToPolishDate(result.paternity.deadline))}
          </AppText>
        </View>
      ) : null}
      {result.unusedParentalWeeks > 0 ? (
        <View className="mt-2 flex-row items-center gap-2 rounded-field bg-warning-soft p-3">
          <Ionicons name="alert-circle-outline" size={18} color={c.warning} />
          <AppText variant="small" className="flex-1">
            {t.unused(result.unusedParentalWeeks)}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

/** Gdzie i kiedy złożyć wniosek (płatnik: pracodawca albo ZUS). */
export function WhereCard({ result, upfront }: { result: BenefitScenarioResult; upfront: boolean }) {
  const c = useThemeColors();
  const items = [t.payer[result.payer].replace('{n}', String(legal().payerThresholdInsured)), ...(upfront && result.amounts ? [t.deadline21] : []), t.documentsHint];
  return (
    <Card className="gap-3 p-5">
      <View className="flex-row items-center gap-3">
        <IconBadge icon="send-outline" tone="info" size={40} />
        <AppText variant="heading" accessibilityRole="header" className="flex-1">
          {t.whereTitle}
        </AppText>
      </View>
      <Bullets items={items} icon="arrow-forward-circle-outline" color={c.primary} />
    </Card>
  );
}

/** Jak to policzyliśmy – przejrzyste kroki od wynagrodzenia do stawki dziennej. */
export function HowCard({ result, gross }: { result: BenefitScenarioResult; gross: number }) {
  const base = result.base;
  if (!base) return null;
  const rows: [string, string][] = [
    [t.howGross, formatMoney(gross)],
    [t.howContributions(formatPercent(legal().socialContributionRate)), `− ${formatMoney(gross * legal().socialContributionRate)}`],
    [t.howBase, formatMoney(base.base)],
    [t.howDaily, formatMoney(base.dailyBase)],
  ];
  const extra = [...(base.minimumApplied ? [t.howMinimum] : []), ...(base.capApplied ? [t.howCap] : []), ...result.notes];
  return (
    <Card className="gap-1 p-5">
      <AppText variant="heading" accessibilityRole="header" className="mb-2">
        {t.howTitle}
      </AppText>
      {rows.map(([label, value]) => (
        <View key={label} className="flex-row justify-between gap-3 border-b border-base-300 py-2.5">
          <AppText tone="muted" className="flex-1">
            {label}
          </AppText>
          <AppText variant="bodyStrong">{value}</AppText>
        </View>
      ))}
      {extra.length ? (
        <View className="mt-3 gap-1.5">
          {extra.map((note) => (
            <AppText key={note} variant="small" tone="muted">
              • {note}
            </AppText>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

/** Drugi rodzic: własne prawo, kwoty przejętego macierzyńskiego, rodzicielskiego i ojcowskiego + suma dla rodziny. */
export function PartnerCard({ result }: { result: BenefitScenarioResult }) {
  const c = useThemeColors();
  const partner = result.partner;
  if (!partner) return null;
  const s = STATUS[partner.eligibility.status];
  const amounts = partner.amounts;
  const notes = [...partner.eligibility.reasons, ...partner.eligibility.missing, ...partner.eligibility.warnings];
  return (
    <Card className="gap-3 p-5">
      <View className="flex-row items-center gap-3">
        <IconBadge icon={s.icon} tone={s.tone} size={40} />
        <View className="flex-1">
          <AppText variant="caption" tone="muted" className="uppercase tracking-wide">
            {t.partnerResultTitle}
          </AppText>
          <AppText variant="heading" accessibilityRole="header">
            {t.partnerStatus[partner.eligibility.status]}
          </AppText>
        </View>
      </View>
      {notes.length ? <Bullets items={notes} icon="ellipse" color={c.baseContentMuted} /> : null}
      {amounts?.segments.map((x) => (
        <View key={x.leave} className="flex-row items-start justify-between gap-3 border-b border-base-300 py-3" accessible>
          <View className="min-w-0 flex-1 gap-0.5">
            <AppText variant="bodyStrong">{x.label}</AppText>
            <AppText variant="small" tone="muted">
              {t.weeks(x.weeks)} · {t.rateDaily(formatPercent(x.rate), formatMoney(x.dailyAmount))}
            </AppText>
          </View>
          <AppText variant="bodyStrong">{formatMoney(x.amount)}</AppText>
        </View>
      ))}
      {amounts ? (
        <View className="flex-row items-center justify-between">
          <AppText variant="subheading">{t.total}</AppText>
          <AppText variant="heading">{formatMoney(amounts.totalAmount)}</AppText>
        </View>
      ) : null}
      {result.familyTotal > 0 && amounts ? (
        <StatTile emphasis label={t.familyTotal} value={formatMoney(result.familyTotal, 0)} hint={t.familyTotalHint} />
      ) : null}
    </Card>
  );
}

/** Wynik oceny uzupełniającego urlopu macierzyńskiego (także gdy nie przysługuje). */
export function SupplementaryCard({ result }: { result: BenefitScenarioResult }) {
  const info = result.supplementary;
  if (!info) return null;
  return (
    <Card className={info.eligible ? 'gap-2 p-5' : 'gap-2 bg-warning-soft p-5'}>
      <AppText variant="bodyStrong">{info.eligible ? t.supplementaryResult(info.weeks, info.caseLabel) : t.supplementaryNone}</AppText>
      {info.notes.map((n) => (
        <AppText key={n} variant="small" tone="muted">
          • {n}
        </AppText>
      ))}
    </Card>
  );
}
