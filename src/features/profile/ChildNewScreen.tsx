import { useState } from 'react';

import { useToday } from '@/core/clock/useToday';
import { goBack } from '@/core/navigation/routes';
import { childFormErrors, hasErrors } from '@/core/profile/childValidation';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { Alert, Button, ChildFields, Screen, type ChildFieldsValue } from '@/shared/ui';

/**
 * Nowe dziecko – tylko „w drodze”. Urodzone dzieci pochodzą z rejestru (mObywatel / USC),
 * a dziecko w drodze po porodzie oznacza się jako urodzone na ekranie dziecka.
 */
export function ChildNewScreen() {
  const today = useToday();
  const addChild = useProfileStore((s) => s.addChild);
  const [value, setValue] = useState<ChildFieldsValue>({ name: '', status: 'expected' });
  const [showErrors, setShowErrors] = useState(false);
  const errors = childFormErrors(value, today);

  const save = () => {
    if (hasErrors(errors)) return setShowErrors(true);
    addChild({
      name: value.name.trim() || pl.childForm.defaultExpectedName,
      status: 'expected',
      dueDate: value.dueDate,
      sex: value.sex,
    });
    goBack();
  };

  return (
    <Screen keyboard>
      <Alert tone="info">{pl.profile.newChildExpectedOnly}</Alert>
      <ChildFields value={{ ...value, status: 'expected' }} onChange={(v) => setValue({ ...v, status: 'expected' })} errors={showErrors ? errors : undefined} hideStatus />
      <Button label={pl.common.save} icon="checkmark" onPress={save} />
    </Screen>
  );
}
