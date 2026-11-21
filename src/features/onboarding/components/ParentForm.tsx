import { pl } from '@/shared/i18n/pl';
import { ParentFields } from '@/shared/ui';

import type { DraftParent } from '../onboardingDraft.store';

type Props = {
  value: DraftParent;
  onChange: (value: DraftParent) => void;
  /** Pokaż błędy walidacji (po próbie przejścia dalej). */
  showErrors: boolean;
};

export function isParentValid(value: DraftParent): boolean {
  return value.firstName.trim().length > 0;
}

export function ParentForm({ value, onChange, showErrors }: Props) {
  const nameError = showErrors && !isParentValid(value) ? pl.common.required : undefined;
  return <ParentFields value={value} onChange={onChange} nameError={nameError} />;
}
