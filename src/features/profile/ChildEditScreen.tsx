import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { useToday } from '@/core/clock/useToday';
import { goBack } from '@/core/navigation/routes';
import { getChildColor } from '@/core/profile/childColors';
import { childFormErrors, hasErrors } from '@/core/profile/childValidation';
import { useProfileStore } from '@/core/profile/profile.store';
import type { Child } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { useIsDark } from '@/shared/theme';
import { AppText, Button, ChildDot, ChildFields, EmptyState, Screen, type ChildFieldsValue } from '@/shared/ui';

import { MarkBornSheet } from './components/MarkBornSheet';

export function ChildEditScreen() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const child = useProfileStore((s) => s.profile?.children.find((c) => c.id === childId));
  if (!child) return <EmptyState title={pl.common.notFoundTitle} />;
  return <ChildEditForm key={`${child.id}:${child.status}`} child={child} />;
}

function ChildEditForm({ child }: { child: Child }) {
  const today = useToday();
  const isDark = useIsDark();
  const updateChild = useProfileStore((s) => s.updateChild);
  const removeChild = useProfileStore((s) => s.removeChild);
  const childrenCount = useProfileStore((s) => s.profile?.children.length ?? 0);
  const [value, setValue] = useState<ChildFieldsValue>(child);
  const [showErrors, setShowErrors] = useState(false);
  const [markBorn, setMarkBorn] = useState(false);
  const errors = childFormErrors(value, today);

  const save = () => {
    if (hasErrors(errors)) return setShowErrors(true);
    const born = value.status === 'born';
    updateChild(child.id, {
      name: value.name.trim() || (born ? child.name : pl.childForm.defaultExpectedName),
      status: value.status,
      birthDate: born ? value.birthDate : undefined,
      dueDate: born ? (child.dueDate ?? undefined) : value.dueDate,
      sex: value.sex,
      premature: born ? (value.premature ?? false) : undefined,
      disability: born ? value.disability : undefined,
    });
    goBack();
  };

  const remove = () => {
    if (childrenCount <= 1) return Alert.alert(pl.profile.cannotRemoveLast);
    Alert.alert(pl.profile.removeChildTitle, pl.profile.removeChildBody, [
      { text: pl.common.cancel, style: 'cancel' },
      {
        text: pl.common.delete,
        style: 'destructive',
        onPress: () => {
          if (removeChild(child.id)) goBack();
        },
      },
    ]);
  };

  return (
    <Screen keyboard>
      <View className="flex-row items-center gap-3">
        <ChildDot name={child.name} color={getChildColor(child.colorKey, isDark)} size={32} />
        <AppText variant="title">{child.name}</AppText>
      </View>
      {child.status === 'expected' ? <Button label={pl.profile.markBorn} icon="sparkles-outline" onPress={() => setMarkBorn(true)} /> : null}
      <ChildFields value={value} onChange={setValue} errors={showErrors ? errors : undefined} />
      <Button label={pl.common.save} icon="checkmark" onPress={save} />
      <Button label={pl.common.delete} variant="ghost" icon="trash-outline" onPress={remove} />
      <MarkBornSheet
        child={markBorn ? child : null}
        onClose={() => {
          setMarkBorn(false);
        }}
      />
    </Screen>
  );
}

