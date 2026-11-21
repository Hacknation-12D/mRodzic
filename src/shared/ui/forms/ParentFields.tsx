import { View } from 'react-native';

import { pl } from '../../i18n/pl';
import { SegmentedControl } from '../SegmentedControl';
import { Select } from '../Select';
import { TextField } from '../TextField';
import { AppText } from '../AppText';

/** Strukturalnie zgodne z core Parent (shared nie importuje core). */
export type ParentFieldsValue = {
  firstName: string;
  gender: 'female' | 'male' | 'undisclosed';
  employment?: 'employment_contract' | 'self_employed' | 'civil_contract' | 'unemployed' | 'student' | 'other';
};

type Props = {
  value: ParentFieldsValue;
  onChange: (value: ParentFieldsValue) => void;
  nameError?: string;
};

const EMPLOYMENTS = Object.keys(pl.employment) as NonNullable<ParentFieldsValue['employment']>[];

export function ParentFields({ value, onChange, nameError }: Props) {
  return (
    <View className="gap-4">
      <TextField
        label={pl.parentForm.firstName}
        value={value.firstName}
        onChangeText={(firstName) => onChange({ ...value, firstName })}
        autoCapitalize="words"
        textContentType="givenName"
        error={nameError}
      />
      <View className="gap-1">
        <AppText variant="bodyStrong">{pl.parentForm.gender}</AppText>
        <SegmentedControl
          accessibilityLabel={pl.parentForm.gender}
          value={value.gender}
          onChange={(gender) => onChange({ ...value, gender })}
          segments={(['female', 'male', 'undisclosed'] as const).map((g) => ({ value: g, label: pl.gender[g] }))}
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

