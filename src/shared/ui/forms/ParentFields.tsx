import { View } from 'react-native';

import { pl } from '../../i18n/pl';
import { toISODate } from '../../lib/date';
import { DateField } from '../DateField';
import { SegmentedControl } from '../SegmentedControl';
import { Select } from '../Select';
import { TextField } from '../TextField';
import { AppText } from '../AppText';

/** Strukturalnie zgodne z core Parent (shared nie importuje core). */
export type ParentFieldsValue = {
  firstName: string;
  gender: 'female' | 'male' | 'undisclosed';
  employment?: 'employment_contract' | 'self_employed' | 'civil_contract' | 'unemployed' | 'student' | 'other';
  lastName?: string;
  birthDate?: string;
  street?: string;
  houseNumber?: string;
  apartmentNumber?: string;
  city?: string;
  postalCode?: string;
  pesel?: string;
};

const identityFields = [
  { key: 'lastName', label: 'Nazwisko', maxLength: 80 },
  { key: 'birthDate', label: 'Data urodzenia', maxLength: 10 },
  { key: 'pesel', label: 'PESEL', maxLength: 11, inputMode: 'numeric' },
  { key: 'street', label: 'Ulica', maxLength: 100 },
  { key: 'houseNumber', label: 'Numer domu', maxLength: 15 },
  { key: 'apartmentNumber', label: 'Numer lokalu', maxLength: 15 },
  { key: 'city', label: 'Miejscowość', maxLength: 80 },
  { key: 'postalCode', label: 'Kod pocztowy', maxLength: 6, hint: '00-000' },
] as const;

type Props = {
  value: ParentFieldsValue;
  onChange: (value: ParentFieldsValue) => void;
  nameError?: string;
  showIdentity?: boolean;
  identityErrors?: Partial<Record<(typeof identityFields)[number]['key'], string>>;
};

const EMPLOYMENTS = Object.keys(pl.employment) as NonNullable<ParentFieldsValue['employment']>[];

export function ParentFields({ value, onChange, nameError, showIdentity, identityErrors }: Props) {
  return (
    <View className="gap-4">
      <TextField
        label={pl.parentForm.firstName}
        value={value.firstName}
        onChangeText={(firstName) => onChange({ ...value, firstName })}
        autoCapitalize="words"
        textContentType="givenName"
        maxLength={60}
        error={nameError}
      />
      {showIdentity ? identityFields.map(({ key, ...field }) => key === 'birthDate' ? (
        <DateField
          key={key}
          label={`${field.label} ${pl.common.optional}`}
          value={value.birthDate}
          maxDate={toISODate(new Date())}
          onChange={(birthDate) => onChange({ ...value, birthDate })}
          error={identityErrors?.birthDate}
        />
      ) : (
        <TextField
          key={key}
          {...field}
          optional
          optionalLabel={pl.common.optional}
          value={value[key] ?? ''}
          onChangeText={(text) => onChange({ ...value, [key]: text || undefined })}
          error={identityErrors?.[key]}
        />
      )) : null}
      <View className="gap-1">
        <AppText variant="bodyStrong">{pl.parentForm.gender}</AppText>
        <SegmentedControl
          accessibilityLabel={pl.parentForm.gender}
          value={value.gender}
          onChange={(gender) => onChange({ ...value, gender })}
          segments={(['female', 'male'] as const).map((g) => ({ value: g, label: pl.gender[g] }))}
        />
      </View>
      <Select
        label={`${pl.parentForm.employment} ${pl.common.optional}`}
        hint={pl.parentForm.employmentHint}
        value={value.employment}
        allowClear
        options={EMPLOYMENTS.map((e) => ({ value: e, label: pl.employment[e] }))}
        onChange={(employment) => onChange({ ...value, employment })}
      />
    </View>
  );
}

