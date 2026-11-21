import { format } from 'date-fns';
import { useState } from 'react';

import { useToday } from '@/core/clock/useToday';
import { childFormErrors, hasErrors } from '@/core/profile/childValidation';
import { useProfileStore } from '@/core/profile/profile.store';
import type { Child } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { Button, ChildFields, Sheet, type ChildFieldsValue } from '@/shared/ui';

type Props = {
  child: Child | null;
  onClose: () => void;
};

/** „Urodziło się!” – zmienia status na born, zachowując id (statusy dokumentów zostają). */
export function MarkBornSheet({ child, onClose }: Props) {
  return (
    <Sheet visible={child !== null} onClose={onClose} title={pl.profile.markBornTitle} footer={<></>}>
      {child ? <MarkBornForm key={child.id} child={child} onDone={onClose} /> : null}
    </Sheet>
  );
}

function MarkBornForm({ child, onDone }: { child: Child; onDone: () => void }) {
  const today = useToday();
  const markChildBorn = useProfileStore((s) => s.markChildBorn);
  const [value, setValue] = useState<ChildFieldsValue>({
    name: child.name === pl.childForm.defaultExpectedName ? '' : child.name,
    status: 'born',
    birthDate: format(today, 'yyyy-MM-dd'),
    sex: child.sex,
    premature: false,
  });
  const [showErrors, setShowErrors] = useState(false);
  const errors = childFormErrors({ ...value, name: value.name || child.name }, today);

  const save = () => {
    if (hasErrors(errors) || !value.birthDate) return setShowErrors(true);
    markChildBorn(child.id, { birthDate: value.birthDate, name: value.name, sex: value.sex, premature: value.premature });
    onDone();
  };

  return (
    <>
      <ChildFields value={value} onChange={setValue} errors={showErrors ? errors : undefined} hideStatus />
      <Button label={pl.profile.markBornSave} icon="checkmark" onPress={save} />
      <Button label={pl.common.cancel} variant="ghost" onPress={onDone} />
    </>
  );
}
