import { View } from 'react-native';

import type { BenefitScenarioInput, SicknessInsurance } from '@/core/benefits';
import type { Employment } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { formatMoney } from '@/shared/lib/money';
import { AppText, Button, Card, DateField, SegmentedControl, Select, Stepper, TextField, ToggleRow } from '@/shared/ui';

import { t } from '../strings';

type Props = {
  input: BenefitScenarioInput;
  grossText: string;
  profileGross: number;
  /** Pole, którego dotyczy błąd kalkulatora. */
  errorField?: string;
  errorMessage?: string;
  maxPartnerWeeks: number;
  onChange: (patch: Partial<BenefitScenarioInput>) => void;
  onGrossChange: (text: string) => void;
  onReset: () => void;
};

const EMPLOYMENTS: Employment[] = ['employment_contract', 'self_employed', 'civil_contract', 'student', 'unemployed', 'other'];

export function InputsCard({ input, grossText, profileGross, errorField, errorMessage, maxPartnerWeeks, onChange, onGrossChange, onReset }: Props) {
  const adopting = input.kind === 'adoption' || input.kind === 'foster';
  const voluntary = input.employment === 'self_employed' || input.employment === 'civil_contract';
  const insured = input.employment !== 'student' && input.employment !== 'unemployed';
  const err = (field: string) => (errorField?.startsWith(field) ? errorMessage : undefined);

  return (
    <Card className="gap-4 p-5">
      <DateField label={t.eventDate[input.kind]} value={input.eventDate} onChange={(v) => onChange({ eventDate: v ?? '' })} error={err('eventDate') ?? err('startDate')} />
      {adopting ? (
        <DateField
          label={t.childBirthDate}
          value={input.childBirthDate}
          onChange={(v) => onChange({ childBirthDate: v })}
          error={err('childBirthDate')}
        />
      ) : null}
      {input.kind === 'foster' ? (
        <ToggleRow label={t.schoolDeferral} hint={t.schoolDeferralHint} value={Boolean(input.schoolDeferral)} onChange={(v) => onChange({ schoolDeferral: v })} />
      ) : null}
      <Stepper label={t.childrenCount(adopting)} value={input.childrenCount} min={1} max={5} onChange={(n) => onChange({ childrenCount: n })} />

      <View className="h-px bg-base-300" />

      <Select
        label={t.employment}
        value={input.employment}
        options={EMPLOYMENTS.map((e) => ({ value: e, label: pl.employment[e] }))}
        onChange={(v) => v && onChange({ employment: v })}
      />
      {voluntary ? (
        <View className="gap-2">
          <AppText variant="bodyStrong">{t.sickness}</AppText>
          <SegmentedControl<SicknessInsurance>
            accessibilityLabel={t.sickness}
            segments={(['yes', 'no', 'unknown'] as const).map((v) => ({ value: v, label: t.sicknessOptions[v] }))}
            value={input.sicknessInsurance}
            onChange={(v) => onChange({ sicknessInsurance: v })}
          />
        </View>
      ) : null}
      {insured ? (
        <TextField
          label={voluntary ? t.grossVoluntary : t.grossEmployee}
          hint={profileGross > 0 ? t.grossFromProfile(formatMoney(profileGross)) : t.grossHint}
          value={grossText}
          onChangeText={onGrossChange}
          keyboardType="decimal-pad"
          inputMode="decimal"
          error={err('averageMonthlyGross')}
        />
      ) : null}

      <View className="h-px bg-base-300" />

      {input.loss ? null : (
        <>
      <ToggleRow label={t.zaZyciem} hint={t.zaZyciemHint} value={input.zaZyciem} onChange={(v) => onChange({ zaZyciem: v })} />
      <Stepper
        label={t.partnerWeeks}
        hint={t.partnerWeeksHint}
        value={Math.min(input.partnerParentalWeeks, maxPartnerWeeks)}
        min={0}
        max={maxPartnerWeeks}
        onChange={(n) => onChange({ partnerParentalWeeks: n })}
      />
        </>
      )}
      <Button label={t.resetFromProfile} icon="refresh" variant="ghost" compact onPress={onReset} />
    </Card>
  );
}

