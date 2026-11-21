import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { pl } from '../i18n/pl';
import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';
import { Sheet } from './Sheet';

export type SelectOption<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label: string;
  value: T | undefined;
  options: SelectOption<T>[];
  onChange: (value: T | undefined) => void;
  hint?: string;
  /** Pozwala wyczyścić wybór (wartość opcjonalna). */
  allowClear?: boolean;
  clearLabel?: string;
};

/** DaisyUI: fieldset + select. */
export function Select<T extends string>({ label, value, options, onChange, hint, allowClear, clearLabel }: Props<T>) {
  const c = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View className="gap-1">
      <AppText variant="bodyStrong">{label}</AppText>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? pl.common.choose}`}
        className="min-h-11 flex-row items-center justify-between rounded-field border border-base-300 bg-base-100 px-3">
        <AppText tone={selected ? 'default' : 'muted'}>{selected?.label ?? pl.common.choose}</AppText>
        <Ionicons name="chevron-down" size={18} color={c.baseContentMuted} />
      </Pressable>
      {hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        {[...(allowClear ? [{ value: undefined, label: clearLabel ?? pl.common.dontKnow }] : []), ...options].map((o) => {
          const isSel = o.value === value;
          return (
            <Pressable
              key={o.value ?? '__none'}
              onPress={() => {
                onChange(o.value as T | undefined);
                setOpen(false);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSel }}
              className={cn(
                'min-h-11 flex-row items-center justify-between rounded-field border bg-base-100 px-3',
                isSel ? 'border-primary' : 'border-base-300',
              )}>
              <AppText variant={isSel ? 'bodyStrong' : 'body'}>{o.label}</AppText>
              {isSel ? <Ionicons name="checkmark" size={20} color={c.primary} /> : null}
            </Pressable>
          );
        })}
      </Sheet>
    </View>
  );
}
