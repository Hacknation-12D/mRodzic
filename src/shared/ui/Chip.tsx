import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { AppText } from './AppText';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
  accessibilityLabel?: string;
  /** Kolor obramowania po zaznaczeniu (np. kolor dziecka). */
  color?: string;
};

/** DaisyUI: badge badge-outline (zaznaczony: bg-base-100 + gruba ramka w kolorze akcentu). */
export function Chip({ label, selected = false, onPress, leading, accessibilityLabel, color }: Props) {
  const content = (
    <View className="shrink flex-row items-center gap-1">
      {leading}
      <AppText variant="small" tone={selected ? 'default' : 'muted'} className={cn('shrink', selected ? 'font-bold' : 'font-medium')}>
        {label}
      </AppText>
    </View>
  );
  const box = cn(
    'max-w-full self-start justify-center rounded-selector px-3 py-1',
    selected ? 'border-2 bg-base-100' : 'border border-base-300 bg-neutral-soft',
    selected && !color && 'border-primary',
  );
  const accent = selected && color ? { borderColor: color } : undefined;
  if (!onPress) {
    return (
      <View className={box} style={accent}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={6}
      className={cn(box, 'min-h-9 active:opacity-80')}
      style={accent}>
      {content}
    </Pressable>
  );
}
