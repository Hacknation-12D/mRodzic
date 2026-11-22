import { ParentSchema } from '../schemas/profile';
import type { Parent } from '../types';

const fields = {
  lastName: 'Podaj nazwisko (maksymalnie 80 znaków).',
  birthDate: 'Podaj poprawną datę w formacie RRRR-MM-DD.',
  street: 'Podaj ulicę (maksymalnie 100 znaków).',
  houseNumber: 'Podaj poprawny numer domu.',
  apartmentNumber: 'Podaj poprawny numer lokalu.',
  city: 'Podaj miejscowość (maksymalnie 80 znaków).',
  postalCode: 'Podaj kod pocztowy w formacie 00-000.',
  pesel: 'Podaj 11 cyfr numeru PESEL.',
} as const;

export function parentIdentityErrors(value: Omit<Parent, 'id'>) {
  const errors: Partial<Record<keyof typeof fields, string>> = {};
  for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
    if (!ParentSchema.shape[key].safeParse(value[key]).success) errors[key] = fields[key];
  }
  if (value.birthDate && new Date(value.birthDate) > new Date()) errors.birthDate = 'Data urodzenia nie może przypadać w przyszłości.';
  return errors;
}
