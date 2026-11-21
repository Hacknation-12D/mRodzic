import { useState } from 'react';

import { isoToPolishDate, parsePolishDate } from '../lib/date';
import { pl } from '../i18n/pl';
import { TextField } from './TextField';

type Props = {
  label: string;
  /** ISO YYYY-MM-DD albo undefined. */
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  hint?: string;
  error?: string;
};

/**
 * Pole daty jako tekst „DD.MM.RRRR” – działa w Expo Go na iOS/Android/web bez natywnych modułów.
 * TODO(verify): rozważyć @react-native-community/datetimepicker (wymaga sprawdzenia API dla SDK).
 */
export function DateField({ label, value, onChange, hint, error }: Props) {
  const [text, setText] = useState(isoToPolishDate(value));
  const [touched, setTouched] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  // Synchronizacja, gdy wartość zmieni się z zewnątrz (np. „Dodaj bliźniaka”) –
  // wzorzec „pochodny stan z propsów” bez useEffect.
  if (prevValue !== value) {
    setPrevValue(value);
    if (parsePolishDate(text) !== (value ?? null)) setText(isoToPolishDate(value));
  }

  const parsed = parsePolishDate(text);
  const formatError = touched && text.length > 0 && !parsed ? pl.common.invalidDate : undefined;

  return (
    <TextField
      label={label}
      value={text}
      placeholder={pl.common.dateHint}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      hint={hint ?? pl.common.dateHint}
      error={formatError ?? error}
      onBlur={() => setTouched(true)}
      onChangeText={(t) => {
        setText(t);
        const iso = parsePolishDate(t);
        onChange(iso ?? undefined);
      }}
    />
  );
}
