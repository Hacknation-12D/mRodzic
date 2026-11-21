import { useState } from 'react';
import { View } from 'react-native';

import { parentIdentityErrors } from '@/core/profile/parentIdentity';
import { ParentSchema } from '@/core/schemas/profile';
import type { Parent } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { createId } from '@/shared/lib/id';
import { AppText, Button, Card, ParentFields, type ParentFieldsValue } from '@/shared/ui';

type Props = {
  title: string;
  parent: Parent | undefined;
  onSave: (parent: Parent) => void;
  onRemove?: () => void;
  addLabel?: string;
  emptyLabel?: string;
  showIdentity?: boolean;
};

export function ParentCard({ title, parent, onSave, onRemove, addLabel, emptyLabel, showIdentity }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ParentFieldsValue>(parent ?? { firstName: '', gender: 'male' });
  const [showErrors, setShowErrors] = useState(false);

  const startEdit = () => {
    setDraft(parent ?? { firstName: '', gender: 'male' });
    setShowErrors(false);
    setEditing(true);
  };
  const save = () => {
    const parsed = ParentSchema.safeParse({ ...draft, id: parent?.id ?? createId('parent_') });
    if (!parsed.success || Object.keys(parentIdentityErrors(draft)).length > 0) return setShowErrors(true);
    onSave(parsed.data);
    setEditing(false);
  };

  return (
    <Card>
      <AppText variant="subheading" accessibilityRole="header">
        {title}
      </AppText>
      {editing ? (
        <View className="gap-3">
          <ParentFields value={draft} onChange={setDraft} nameError={showErrors && !draft.firstName.trim() ? pl.common.required : undefined} showIdentity={showIdentity} identityErrors={showErrors ? parentIdentityErrors(draft) : undefined} />
          <View className="flex-row gap-2">
            <Button label={pl.common.cancel} variant="ghost" onPress={() => setEditing(false)} className="flex-1" />
            <Button label={pl.common.save} onPress={save} className="flex-1" />
          </View>
        </View>
      ) : parent ? (
        <>
          <AppText variant="bodyStrong">{[parent.firstName, parent.lastName].filter(Boolean).join(' ')}</AppText>
          <AppText tone="muted">
            {pl.gender[parent.gender]}
            {parent.employment ? ` · ${pl.employment[parent.employment]}` : ''}
          </AppText>
          <View className="flex-row gap-2">
            <Button label={pl.common.edit} variant="secondary" icon="create-outline" onPress={startEdit} compact className="flex-1" />
            {onRemove ? <Button label={pl.common.delete} variant="ghost" icon="trash-outline" onPress={onRemove} compact className="flex-1" /> : null}
          </View>
        </>
      ) : (
        <>
          {emptyLabel ? <AppText tone="muted">{emptyLabel}</AppText> : null}
          {addLabel ? <Button label={addLabel} variant="secondary" icon="person-add-outline" onPress={startEdit} /> : null}
        </>
      )}
    </Card>
  );
}

