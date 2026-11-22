import { View } from 'react-native';

import { pl } from '../../i18n/pl';
import { AppText } from '../AppText';
import { DateField } from '../DateField';
import { SegmentedControl } from '../SegmentedControl';
import { Select } from '../Select';
import { TextField } from '../TextField';
import { ToggleRow } from '../ToggleRow';

/** Strukturalnie zgodne z polami core Child (shared nie importuje core). */
export type ChildFieldsValue = {
  name: string;
  status: 'expected' | 'born';
  dueDate?: string;
  birthDate?: string;
  sex?: 'female' | 'male' | 'unknown';
  premature?: boolean;
  disability?: boolean;
};

export type ChildFieldsErrors = Partial<Record<'name' | 'dueDate' | 'birthDate', string>>;

type Props = {
  value: ChildFieldsValue;
  onChange: (value: ChildFieldsValue) => void;
  errors?: ChildFieldsErrors;
  /** Ukrywa przełącznik statusu (np. w MarkBornSheet). */
  hideStatus?: boolean;
  /**
   * Czy pozwolić wybrać „Już jest na świecie”. Domyślnie NIE: urodzone dzieci (PESEL, akt urodzenia, ubezpieczenie)
   * pochodzą z rejestru (ZUS / USC, w demo – z bazy), a ręcznie dodaje się tylko dziecko w drodze.
   */
  allowBorn?: boolean;
};

type TriState = 'yes' | 'no' | 'unknown';
const toTri = (v: boolean | undefined): TriState => (v === undefined ? 'unknown' : v ? 'yes' : 'no');
const fromTri = (v: TriState): boolean | undefined => (v === 'unknown' ? undefined : v === 'yes');

export function ChildFields({ value, onChange, errors, hideStatus, allowBorn = false }: Props) {
  const isBorn = value.status === 'born';
  return (
    <View className="gap-4">
      {hideStatus || !allowBorn ? null : (
        <SegmentedControl
          value={value.status}
          onChange={(status) => onChange({ ...value, status })}
          segments={[
            { value: 'born', label: pl.childForm.statusBorn },
            { value: 'expected', label: pl.childForm.statusExpected },
          ]}
        />
      )}
      <TextField
        label={pl.childForm.name}
        value={value.name}
        onChangeText={(name) => onChange({ ...value, name })}
        autoCapitalize="words"
        hint={isBorn ? undefined : pl.childForm.nameExpectedHint}
        error={errors?.name}
      />
      {isBorn ? (
        <DateField
          label={pl.childForm.birthDate}
          value={value.birthDate}
          onChange={(birthDate) => onChange({ ...value, birthDate })}
          error={errors?.birthDate}
        />
      ) : (
        <DateField
          label={pl.childForm.dueDate}
          value={value.dueDate}
          onChange={(dueDate) => onChange({ ...value, dueDate })}
          error={errors?.dueDate}
        />
      )}
      <Select
        label={`${pl.childForm.sex} ${pl.common.optional}`}
        value={value.sex}
        allowClear
        options={(['female', 'male', 'unknown'] as const).map((s) => ({ value: s, label: pl.childSex[s] }))}
        onChange={(sex) => onChange({ ...value, sex })}
      />
      {isBorn ? (
        <>
          <ToggleRow label={pl.childForm.premature} value={value.premature ?? false} onChange={(premature) => onChange({ ...value, premature })} />
          <View className="gap-1">
            <AppText variant="bodyStrong">{pl.childForm.disability}</AppText>
            <SegmentedControl
              accessibilityLabel={pl.childForm.disability}
              value={toTri(value.disability)}
              onChange={(v) => onChange({ ...value, disability: fromTri(v) })}
              segments={[
                { value: 'yes', label: pl.common.yes },
                { value: 'no', label: pl.common.no },
                { value: 'unknown', label: pl.common.dontKnow },
              ]}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

