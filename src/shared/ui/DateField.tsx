import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { pl } from '../i18n/pl';
import { cn } from '../lib/cn';
import { fromISODate, isoToPolishDate, toISODate } from '../lib/date';
import { useIsDark, useThemeColors } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';

export type DateFieldProps = {
  label: string;
  /** ISO YYYY-MM-DD albo undefined. */
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  hint?: string;
  error?: string;
  /** Najwcześniejsza / najpóźniejsza data do wyboru (ISO). */
  minDate?: string;
  maxDate?: string;
};

/** Pole wyświetlające wybraną datę – wspólne dla iOS i Androida (web: DateField.web.tsx). */
function DateFieldShell({
  label,
  value,
  hint,
  error,
  onPress,
}: Pick<DateFieldProps, 'label' | 'value' | 'hint' | 'error'> & { onPress: () => void }) {
  const c = useThemeColors();
  const text = value ? isoToPolishDate(value) : pl.common.pickDate;
  return (
    <View className="gap-1">
      <AppText variant="bodyStrong">{label}</AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? text : pl.common.pickDate}`}
        accessibilityHint={pl.common.pickDateHint}
        className={cn(
          'min-h-12 flex-row items-center justify-between gap-2 rounded-field border bg-base-100 px-3 active:opacity-80',
          error ? 'border-error' : 'border-base-300',
        )}>
        <AppText tone={value ? 'default' : 'muted'}>{text}</AppText>
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
      </Pressable>
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

/**
 * Wybór daty kalendarzem (Expo UI, działa w Expo Go):
 *  - Android: systemowe okno dialogowe (montowane na czas wyboru),
 *  - iOS: kalendarz w arkuszu z przyciskami „Wyczyść” i „Gotowe”.
 */
export function DateField({ label, value, onChange, hint, error, minDate, maxDate }: DateFieldProps) {
  const c = useThemeColors();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(() => (value ? fromISODate(value) : new Date()));
  const minimumDate = minDate ? fromISODate(minDate) : undefined;
  const maximumDate = maxDate ? fromISODate(maxDate) : undefined;

  const openPicker = () => {
    setDraft(value ? fromISODate(value) : new Date());
    setOpen(true);
  };

  return (
    <>
      <DateFieldShell label={label} value={value} hint={hint} error={error} onPress={openPicker} />
      {Platform.OS === 'android' ? (
        open ? (
          <DateTimePicker
            value={draft}
            mode="date"
            presentation="dialog"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={c.primary}
            positiveButton={{ label: pl.common.done }}
            onValueChange={(_, date) => {
              setOpen(false);
              onChange(toISODate(date));
            }}
            onDismiss={() => setOpen(false)}
          />
        ) : null
      ) : (
        <Sheet
          visible={open}
          onClose={() => setOpen(false)}
          title={label}
          footer={
            <View className="flex-row gap-3">
              {value ? (
                <Button
                  label={pl.common.clearDate}
                  variant="ghost"
                  className="flex-1"
                  onPress={() => {
                    setOpen(false);
                    onChange(undefined);
                  }}
                />
              ) : null}
              <Button
                label={pl.common.done}
                icon="checkmark"
                className="flex-1"
                onPress={() => {
                  setOpen(false);
                  onChange(toISODate(draft));
                }}
              />
            </View>
          }>
          <DateTimePicker
            value={draft}
            mode="date"
            display="inline"
            locale="pl_PL"
            themeVariant={dark ? 'dark' : 'light'}
            accentColor={c.primary}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_, date) => setDraft(date)}
          />
        </Sheet>
      )}
    </>
  );
}
