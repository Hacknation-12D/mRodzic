import { View } from 'react-native';

import { legal, type BenefitScenarioInput, type MaternityTransferReason, type SicknessInsurance } from '@/core/benefits';
import type { Employment } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Card, DateField, SegmentedControl, Select, Stepper, TextField, ToggleRow } from '@/shared/ui';

import { t } from '../strings';

type Props = {
  input: BenefitScenarioInput;
  /** Tekst pola wynagrodzenia drugiego rodzica (wpisywany jak kwota). */
  partnerGrossText: string;
  onPartnerGrossChange: (text: string) => void;
  /** Dane drugiego rodzica z profilu – do włączenia sekcji. */
  partnerFromProfile: NonNullable<BenefitScenarioInput['partner']>;
  errorField?: string;
  errorMessage?: string;
  onChange: (patch: Partial<BenefitScenarioInput>) => void;
};

const EMPLOYMENTS: Employment[] = ['employment_contract', 'self_employed', 'civil_contract', 'student', 'unemployed', 'other'];
const REASONS: MaternityTransferReason[] = ['standard', 'hospital', 'incapacity', 'death', 'abandonment'];

/** Drugi rodzic, przejęcie macierzyńskiego, uzupełniający urlop macierzyński i ryzyka (zadanie ZUS pkt 3 b, d, h). */
export function FamilyInputsCard({ input, partnerGrossText, onPartnerGrossChange, partnerFromProfile, errorField, errorMessage, onChange }: Props) {
  const p = legal();
  const birthLike = (input.kind === 'birth' || input.kind === 'pregnancy') && !input.loss;
  const partner = input.partner;
  const voluntaryPartner = partner?.employment === 'self_employed' || partner?.employment === 'civil_contract';
  const insuredPartner = partner && partner.employment !== 'student' && partner.employment !== 'unemployed';
  const transfer = input.maternityTransfer ?? { weeks: 0, reason: 'standard' as const };
  const motherMin =
    transfer.reason === 'death' || transfer.reason === 'abandonment' ? 0 : transfer.reason === 'standard' ? p.maternityMotherMinWeeks : p.maternityMotherMinWeeksSpecial;
  const maxTransfer = Math.max(0, p.maternityWeeks[Math.min(input.childrenCount, 5) - 1] - motherMin);
  const sup = input.supplementary;
  const err = (field: string) => (errorField?.startsWith(field) ? errorMessage : undefined);

  return (
    <Card className="gap-4 p-5">
      <AppText variant="heading" accessibilityRole="header">
        {t.familyTitle}
      </AppText>

      <ToggleRow
        label={t.hasPartner}
        hint={t.hasPartnerHint}
        value={Boolean(partner)}
        onChange={(v) => onChange({ partner: v ? partnerFromProfile : undefined })}
      />
      {partner ? (
        <View className="gap-3 border-l-2 border-base-300 pl-3">
          <Select
            label={t.partnerEmployment}
            value={partner.employment}
            options={EMPLOYMENTS.map((e) => ({ value: e, label: pl.employment[e] }))}
            onChange={(v) => v && onChange({ partner: { ...partner, employment: v } })}
          />
          {voluntaryPartner ? (
            <SegmentedControl<SicknessInsurance>
              accessibilityLabel={t.partnerSickness}
              segments={(['yes', 'no', 'unknown'] as const).map((v) => ({ value: v, label: t.sicknessOptions[v] }))}
              value={partner.sicknessInsurance}
              onChange={(v) => onChange({ partner: { ...partner, sicknessInsurance: v } })}
            />
          ) : null}
          {insuredPartner ? (
            <TextField label={t.partnerGross} value={partnerGrossText} onChangeText={onPartnerGrossChange} keyboardType="decimal-pad" inputMode="decimal" hint={t.grossHint} />
          ) : null}
        </View>
      ) : null}

      {birthLike && partner ? (
        <>
          <View className="h-px bg-base-300" />
          <AppText variant="bodyStrong">{t.transferTitle}</AppText>
          <Select
            label={t.transferReason}
            value={transfer.reason}
            options={REASONS.map((r) => ({ value: r, label: t.transferReasons[r] }))}
            onChange={(v) => v && onChange({ maternityTransfer: { ...transfer, reason: v } })}
          />
          <Stepper
            label={t.transferWeeks}
            hint={t.transferWeeksHint(motherMin)}
            value={Math.min(transfer.weeks, maxTransfer)}
            min={0}
            max={maxTransfer}
            onChange={(n) => onChange({ maternityTransfer: { ...transfer, weeks: n } })}
          />
        </>
      ) : null}

      {birthLike ? (
        <>
          <View className="h-px bg-base-300" />
          <ToggleRow
            label={t.supplementaryToggle}
            hint={t.supplementaryHint}
            value={Boolean(sup)}
            onChange={(v) =>
              onChange({
                supplementary: v ? { gestationalWeek: 34, birthWeightGrams: 2200, hospitalFrom: input.eventDate, hospitalTo: '', takenBy: 'me' } : undefined,
              })
            }
          />
          {sup ? (
            <View className="gap-3 border-l-2 border-base-300 pl-3">
              <Stepper label={t.gestationalWeek} value={sup.gestationalWeek} min={22} max={42} onChange={(n) => onChange({ supplementary: { ...sup, gestationalWeek: n } })} />
              <TextField
                label={t.birthWeight}
                value={sup.birthWeightGrams ? String(sup.birthWeightGrams) : ''}
                onChangeText={(v) => onChange({ supplementary: { ...sup, birthWeightGrams: Number(v.replace(/\D/g, '')) || 0 } })}
                keyboardType="number-pad"
                inputMode="numeric"
                error={err('supplementary.children')}
              />
              <DateField label={t.hospitalFrom} value={sup.hospitalFrom} onChange={(v) => onChange({ supplementary: { ...sup, hospitalFrom: v ?? '' } })} />
              <DateField
                label={t.hospitalTo}
                value={sup.hospitalTo}
                onChange={(v) => onChange({ supplementary: { ...sup, hospitalTo: v ?? '' } })}
                error={err('supplementary')}
              />
              {partner ? (
                <SegmentedControl<'me' | 'partner'>
                  accessibilityLabel={t.supplementaryWho}
                  segments={(['me', 'partner'] as const).map((v) => ({ value: v, label: t.whoOptions[v] }))}
                  value={sup.takenBy}
                  onChange={(v) => onChange({ supplementary: { ...sup, takenBy: v } })}
                />
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {birthLike ? (
        <>
          <View className="h-px bg-base-300" />
          <AppText variant="bodyStrong">{t.risksTitle}</AppText>
          {input.employment === 'employment_contract' ? (
            <DateField label={t.contractEnd} hint={t.contractEndHint} value={input.contractEndDate} onChange={(v) => onChange({ contractEndDate: v })} />
          ) : null}
          <DateField label={t.insuranceStart} hint={t.insuranceStartHint} value={input.insuranceStartDate} onChange={(v) => onChange({ insuranceStartDate: v })} />
          <ToggleRow label={t.baseRaised} value={Boolean(input.baseRaisedInPregnancy)} onChange={(v) => onChange({ baseRaisedInPregnancy: v })} />
        </>
      ) : null}
    </Card>
  );
}
