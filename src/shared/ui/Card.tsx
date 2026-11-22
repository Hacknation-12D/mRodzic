import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';

import { cn } from '../lib/cn';
import { useElevation, type ElevationLevel } from '../theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
  /** Kolorowy pasek z lewej (np. kolor dziecka). */
  accentColor?: string;
  /** Głębia: 1 = zwykła karta (domyślnie), 2 = wyróżniona, 0 = płaska (np. karta w karcie). */
  elevation?: ElevationLevel;
  /** „tinted” = delikatne tło w kolorze marki (sekcje wyróżnione). */
  tone?: 'default' | 'tinted';
};

/** Karta: zaokrąglona, z subtelnym cieniem zamiast samej ramki (DaisyUI: card bg-base-100 shadow). */
export function Card({ children, onPress, accessibilityLabel, accessibilityHint, className, accentColor, elevation = 1, tone = 'default' }: Props) {
  const shadow = useElevation(elevation);
  const box = cn(
    'gap-2 rounded-box border p-4',
    tone === 'tinted' ? 'border-primary-soft bg-primary-soft' : 'border-base-300 bg-base-100',
    className,
  );
  const style: ViewStyle = { ...shadow, ...(accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : null) };
  if (!onPress) {
    return (
      <View className={box} style={style}>
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
      style={style}>
      {children}
    </Pressable>
  );
}
