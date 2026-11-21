import { parentIdentityErrors } from '@/core/profile/parentIdentity';
import { pl } from '@/shared/i18n/pl';
import { ParentFields } from '@/shared/ui';

import type { DraftParent } from '../onboardingDraft.store';

type Props = {
  value: DraftParent;
  onChange: (value: DraftParent) => void;
  /** Pokaż błędy walidacji (po próbie przejścia dalej). */
  showErrors: boolean;
  showIdentity?: boolean;
};

export function isParentValid(value: DraftParent): boolean {
  return value.firstName.trim().length > 0 && Object.keys(parentIdentityErrors(value)).length === 0;
}

export function ParentForm({ value, onChange, showErrors, showIdentity }: Props) {
  const nameError = showErrors && !value.firstName.trim() ? pl.common.required : undefined;
  return <ParentFields value={value} onChange={onChange} nameError={nameError} showIdentity={showIdentity} identityErrors={showErrors ? parentIdentityErrors(value) : undefined} />;
}
