import { useState } from 'react';

import { useToday } from '@/core/clock/useToday';
import { goBack } from '@/core/navigation/routes';
import { childFormErrors, hasErrors } from '@/core/profile/childValidation';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { Button, ChildFields, Screen, type ChildFieldsValue } from '@/shared/ui';

export function ChildNewScreen() {
  const today = useToday();
  const addChild = useProfileStore((s) => s.addChild);
  const [value, setValue] = useState<ChildFieldsValue>({ name: '', status: 'expected' });
  const [showErrors, setShowErrors] = useState(false);
  const errors = childFormErrors(value, today);

  const save = () => {
    if (hasErrors(errors)) return setShowErrors(true);
    const born = value.status === 'born';
    addChild({
      name: value.name.trim() || pl.childForm.defaultExpectedName,
      status: value.status,
      ...(born ? { birthDate: value.birthDate } : { dueDate: value.dueDate }),
      sex: value.sex,
      premature: born ? (value.premature ?? false) : undefined,
      disability: born ? value.disability : undefined,
    });
    goBack();
  };

  return (
    <Screen keyboard>
      <ChildFields value={value} onChange={setValue} errors={showErrors ? errors : undefined} />
      <Button label={pl.common.save} icon="checkmark" onPress={save} />
    </Screen>
  );
}
