import { useId } from 'react';
import { View } from 'react-native';

import { useIsDark, useThemeColors } from '../theme';
import { AppText } from './AppText';
import type { DateFieldProps } from './DateField';

/**
 * Web: natywny kalendarz przeglądarki (<input type="date">) – klawiatura, czytniki ekranu i telefon działają od razu.
 * Wartość pola to ISO RRRR-MM-DD, więc nie ma konwersji formatów. Wygląd jak TextField.
 */
export function DateField({ label, value, onChange, hint, error, minDate, maxDate }: DateFieldProps) {
  const c = useThemeColors();
  const dark = useIsDark();
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <View className="gap-1">
      <label htmlFor={id}>
        <AppText variant="bodyStrong">{label}</AppText>
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        min={minDate}
        max={maxDate}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? hintId : undefined}
        onChange={(e) => onChange(e.currentTarget.value || undefined)}
        style={{
          minHeight: 48,
          boxSizing: 'border-box',
          width: '100%',
          padding: '0 12px',
          borderRadius: 14,
          border: `1px solid ${error ? c.error : c.base300}`,
          backgroundColor: c.base100,
          color: value ? c.baseContent : c.baseContentMuted,
          accentColor: c.primary,
          colorScheme: dark ? 'dark' : 'light',
          fontFamily: 'inherit',
          fontSize: 15,
          lineHeight: '21px',
          outlineColor: c.primary,
        }}
      />
      {error ? (
        <AppText nativeID={hintId} variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText nativeID={hintId} variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
