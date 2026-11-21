import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>['name'];
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  className?: string;
  compact?: boolean;
};

/** DaisyUI: btn btn-primary | btn-soft | btn-outline | btn-error (+ btn-sm). */
const BTN: Record<Variant, { box: string; text: 'inverse' | 'primary' | 'default' }> = {
  primary: { box: 'bg-primary', text: 'inverse' },
  secondary: { box: 'bg-primary-soft', text: 'primary' },
  ghost: { box: 'bg-transparent border border-base-300', text: 'default' },
  danger: { box: 'bg-error', text: 'inverse' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  accessibilityLabel,
  accessibilityHint,
  className,
  compact,
}: Props) {
  const c = useThemeColors();
  const isDisabled = disabled || loading;
  const spec = BTN[variant];
  const iconColor = variant === 'primary' ? c.primaryContent : variant === 'danger' ? c.errorContent : variant === 'secondary' ? c.primary : c.baseContent;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={4}
      className={cn(
        'min-h-11 items-center justify-center rounded-field py-2 active:opacity-80',
        compact ? 'px-3' : 'px-4',
        spec.box,
        isDisabled && 'opacity-50',
        className,
      )}>
      <View className="flex-row items-center gap-2">
        {loading ? <ActivityIndicator color={iconColor} /> : icon ? <Ionicons name={icon} size={18} color={iconColor} /> : null}
        <AppText variant="bodyStrong" tone={spec.text}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}
