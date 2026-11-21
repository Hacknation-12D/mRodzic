import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  hint?: string;
};

/** DaisyUI: join (btn − | wartość | btn +). */
export function Stepper({ label, value, min, max, onChange, hint }: Props) {
  const c = useThemeColors();
  const btn = (dir: -1 | 1) => {
    const disabled = dir === -1 ? value <= min : value >= max;
    return (
      <Pressable
        onPress={() => onChange(Math.min(max, Math.max(min, value + dir)))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${dir === -1 ? '−' : '+'}1`}
        accessibilityState={{ disabled }}
        className={cn('size-11 items-center justify-center bg-base-100 active:opacity-80', disabled && 'opacity-40')}>
        <Ionicons name={dir === -1 ? 'remove' : 'add'} size={22} color={c.primary} />
      </Pressable>
    );
  };
  return (
    <View className="gap-1" accessibilityRole="adjustable" accessibilityValue={{ min, max, now: value }} accessibilityLabel={label}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View className="flex-row items-center self-start overflow-hidden rounded-field border border-base-300">
        {btn(-1)}
        <View className="min-w-12 items-center border-x border-base-300 bg-base-200 py-2.5">
          <AppText variant="heading">{value}</AppText>
        </View>
        {btn(1)}
      </View>
      {hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
