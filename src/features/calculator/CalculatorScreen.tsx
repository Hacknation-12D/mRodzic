import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  BenefitInputError,
  calculateBenefitScenario,
  calculateParentalLeave,
  legal,
  partnerDefaults,
  scenarioDefaultsFromProfile,
  type BenefitScenarioInput,
  type BenefitScenarioKind,
  type BenefitScenarioResult,
} from '@/core/benefits';
import { useToday } from '@/core/clock/useToday';
import { useLegalRevision } from '@/core/legal/legal.store';
import { goToFamilyPlan, goToApplications } from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import { parseAmount } from '@/shared/lib/money';
import { Alert, AppText, Button, Card, ChoiceTile, IconBadge, Screen, SectionHeader } from '@/shared/ui';

import { FamilyInputsCard } from './components/FamilyInputsCard';
import { InputsCard } from './components/InputsCard';
import { PregnancyCalculator } from './components/PregnancyCalculator';
import { BreakdownCard, EligibilityCard, HowCard, PartnerCard, SummaryStats, SupplementaryCard, TimelineCard, VariantCard, WhereCard } from './components/Results';
import { t } from './strings';

type Mode = BenefitScenarioKind | 'sickness';
const KINDS: { kind: Mode; icon: 'happy-outline' | 'heart-outline' | 'home-outline' | 'people-outline' | 'medkit-outline' }[] = [
  { kind: 'birth', icon: 'happy-outline' },
  { kind: 'pregnancy', icon: 'heart-outline' },
  { kind: 'sickness', icon: 'medkit-outline' },
  { kind: 'adoption', icon: 'home-outline' },
  { kind: 'foster', icon: 'people-outline' },
];

type Outcome = { result: BenefitScenarioResult; error?: undefined } | { result?: undefined; error: BenefitInputError };

const amountText = (n: number) => (n > 0 ? String(n).replace('.', ',') : '');

/** Zintegrowany kalkulator: sytuacja → dane (z profilu) → prawo do zasiłku, urlopy, kwoty, warianty, gdzie złożyć. */
export function CalculatorScreen() {
  const profile = useProfileStore((s) => s.profile);
  const today = useToday();
  const defaults = useMemo(() => scenarioDefaultsFromProfile(profile, today), [profile, today]);
  const [input, setInput] = useState<BenefitScenarioInput>(defaults);
  const [mode, setMode] = useState<Mode>(defaults.kind);
  const [grossText, setGrossText] = useState(amountText(defaults.averageMonthlyGross));
  const partnerFromProfile = useMemo(
    () => partnerDefaults(profile) ?? { employment: 'employment_contract' as const, sicknessInsurance: 'yes' as const, averageMonthlyGross: 0 },
    [profile],
  );
  const [partnerGrossText, setPartnerGrossText] = useState(amountText(partnerFromProfile.averageMonthlyGross));
  const revision = useLegalRevision();

  const patch = (p: Partial<BenefitScenarioInput>) => setInput((prev) => ({ ...prev, ...p }));
  const reset = () => {
    setInput(defaults);
    setMode(defaults.kind);
    setGrossText(amountText(defaults.averageMonthlyGross));
    setPartnerGrossText(amountText(partnerFromProfile.averageMonthlyGross));
  };

  const gross = parseAmount(grossText);
  const partnerGross = parseAmount(partnerGrossText);
  const outcome: Outcome = useMemo(() => {
    try {
      const partner = input.partner ? { ...input.partner, averageMonthlyGross: Number.isFinite(partnerGross) ? partnerGross : 0 } : undefined;
      return { result: calculateBenefitScenario({ ...input, partner, averageMonthlyGross: Number.isFinite(gross) ? gross : 0 }) };
    } catch (e) {
      if (e instanceof BenefitInputError) return { error: e };
      throw e;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revision: przelicz po zmianie parametrów w panelu
  }, [input, gross, partnerGross, revision]);

  const maxPartnerWeeks =
    calculateParentalLeave({ childrenCount: input.childrenCount, zaZyciem: input.zaZyciem }).totalWeeks - legal().parentalNonTransferableWeeks;
  const result = outcome.result;

  return (
    <Screen keyboard>
      <Button label="Podziel rodzicielski i połącz go z pracą" onPress={goToFamilyPlan} />
      <Button label="Przejdź do procesu wniosku" variant="secondary" onPress={goToApplications} />
      {/* Nagłówek */}
      <Card tone="tinted" elevation={0} className="gap-3 p-5 md:p-6">
        <View className="flex-row items-center gap-3">
          <IconBadge icon="calculator-outline" size={52} />
          <AppText variant="title" accessibilityRole="header" className="flex-1">
            {t.heroTitle}
          </AppText>
        </View>
        <AppText>{t.heroBody}</AppText>
        {profile ? (
          <AppText variant="small" tone="muted">
            {t.heroPrefilled}
          </AppText>
        ) : null}
      </Card>

      {/* Sytuacja */}
      <SectionHeader title={t.situation} />
      <View className="flex-row flex-wrap gap-3" accessibilityRole="radiogroup">
        {KINDS.map(({ kind, icon }) => {
          const label = kind === 'sickness' ? t.sicknessKind : t.kinds[kind];
          return (
            <ChoiceTile
              key={kind}
              className="min-w-36 flex-1"
              layout="stacked"
              icon={icon}
              title={label.label}
              description={label.hint}
              selected={mode === kind}
              onPress={() => {
                setMode(kind);
                if (kind !== 'sickness') patch({ kind });
              }}
            />
          );
        })}
      </View>

      {mode === 'sickness' ? <PregnancyCalculator /> : (
      <View className="gap-4 md:flex-row md:items-start">
        {/* Dane */}
        <View className="gap-3 md:w-[44%]">
          <SectionHeader title={t.inputsTitle} />
          <InputsCard
            input={input}
            grossText={grossText}
            profileGross={defaults.averageMonthlyGross}
            errorField={outcome.error?.field}
            errorMessage={outcome.error?.message}
            maxPartnerWeeks={maxPartnerWeeks}
            onChange={patch}
            onGrossChange={setGrossText}
            onReset={reset}
          />
          <FamilyInputsCard
            input={input}
            partnerGrossText={partnerGrossText}
            onPartnerGrossChange={setPartnerGrossText}
            partnerFromProfile={{ ...partnerFromProfile, averageMonthlyGross: Number.isFinite(partnerGross) ? partnerGross : 0 }}
            errorField={outcome.error?.field}
            errorMessage={outcome.error?.message}
            onChange={patch}
          />
        </View>

        {/* Wynik */}
        <View className="gap-4 md:flex-1" accessibilityLiveRegion="polite">
          {result ? (
            <>
              <EligibilityCard eligibility={result.eligibility} />
              <SummaryStats result={result} />
              {result.loss ? null : <VariantCard result={result} upfront={input.upfrontApplication} onChange={(upfrontApplication) => patch({ upfrontApplication })} />}
              <SupplementaryCard result={result} />
              <TimelineCard result={result} />
              <BreakdownCard result={result} />
              <PartnerCard result={result} />
              <WhereCard result={result} upfront={input.upfrontApplication} />
              <HowCard result={result} gross={gross} />
            </>
          ) : (
            <Alert tone="warning" title={t.fixInputs}>
              {outcome.error?.message}
            </Alert>
          )}
          <AppText variant="small" tone="muted" className="px-1">
            {t.disclaimer}
          </AppText>
        </View>
      </View>
      )}
    </Screen>
  );
}

