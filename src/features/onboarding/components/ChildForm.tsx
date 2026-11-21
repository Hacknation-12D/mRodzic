import { View } from 'react-native';

import { getChildColor } from '@/core/profile/childColors';
import type { ChildFormErrors } from '@/core/profile/childValidation';
import { pl } from '@/shared/i18n/pl';
import { createId } from '@/shared/lib/id';
import { useIsDark } from '@/shared/theme';
import { AppText, Button, ChildDot, ChildFields, ToggleRow } from '@/shared/ui';

import { colorForIndex, type DraftChild } from '../onboardingDraft.store';

type Props = {
  index: number;
  value: DraftChild;
  onChange: (patch: Partial<DraftChild>) => void;
  onAddTwin: () => void;
  errors?: ChildFormErrors;
  canAddTwin: boolean;
};

export function ChildForm({ index, value, onChange, onAddTwin, errors, canAddTwin }: Props) {
  const isDark = useIsDark();
  const color = getChildColor(colorForIndex(index), isDark);
  const isMultiple = Boolean(value.multipleBirthGroupId);

  return (
    <View className="gap-4">
      <View className="flex-row items-center gap-2">
        <ChildDot name={value.name || pl.childForm.defaultExpectedName} color={color} size={24} />
        <AppText variant="small" tone="muted">
          {pl.onboarding.children.colorLabel}
        </AppText>
      </View>
      <ChildFields value={value} onChange={(v) => onChange(v)} errors={errors} />
      <ToggleRow
        label={pl.childForm.multiple}
        value={isMultiple}
        onChange={(on) =>
          onChange({
            multipleBirthGroupId: on ? (value.multipleBirthGroupId ?? createId('twins_')) : undefined,
          })
        }
      />
      {isMultiple && canAddTwin ? (
        <Button label={pl.onboarding.children.addTwin} icon="people-outline" variant="secondary" onPress={onAddTwin} />
      ) : null}
    </View>
  );
}
