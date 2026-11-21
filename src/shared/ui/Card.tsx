import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
  /** Kolorowy pasek z lewej (np. kolor dziecka). */
  accentColor?: string;
};

/** DaisyUI: card card-border bg-base-100. */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, className, accentColor }: Props) {
  const box = cn('gap-2 rounded-box border border-base-300 bg-base-100 p-4', className);
  const accent = accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : undefined;
  if (!onPress) {
    return (
      <View className={box} style={accent}>
        {children}
      </View>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      className={cn(box, 'active:opacity-85')}
      style={accent}>
      {children}
    </Pressable>
  );
}
