import { pl } from '../../shared/i18n/pl';
import { validateChildDates } from '../schemas/profile';

export type ChildFormInput = {
  name: string;
  status: 'expected' | 'born';
  dueDate?: string;
  birthDate?: string;
};

export type ChildFormErrors = Partial<Record<'name' | 'dueDate' | 'birthDate', string>>;

/** Błędy formularza dziecka (teksty z i18n). Imię wymagane tylko dla urodzonego dziecka. */
export function childFormErrors(child: ChildFormInput, today: Date): ChildFormErrors {
  const errors: ChildFormErrors = {};
  if (child.status === 'born' && !child.name.trim()) errors.name = pl.common.required;
  const dates = validateChildDates(child, today);
  if (dates.dueDate) errors.dueDate = dates.dueDate === 'dueDateRange' ? pl.childForm.dueDateRange : pl.common.required;
  if (dates.birthDate) errors.birthDate = dates.birthDate === 'birthDateFuture' ? pl.childForm.birthDateFuture : pl.common.required;
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
