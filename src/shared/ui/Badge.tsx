import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

export type BadgeTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

type Props = {
  label: string;
  tone?: BadgeTone;
  icon?: ComponentProps<typeof Ionicons>['name'];
  accessibilityLabel?: string;
};

/** DaisyUI: badge badge-soft badge-{error|warning|success|info|neutral}. */
const BOX: Record<BadgeTone, string> = {
  danger: 'bg-error-soft',
  warning: 'bg-warning-soft',
  success: 'bg-success-soft',
  info: 'bg-info-soft',
  neutral: 'bg-neutral-soft',
};
const TEXT: Record<BadgeTone, string> = {
  danger: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
  neutral: 'text-base-content-muted',
};

export function Badge({ label, tone = 'neutral', icon, accessibilityLabel }: Props) {
  const c = useThemeColors();
  const iconColor = { danger: c.error, warning: c.warning, success: c.success, info: c.info, neutral: c.baseContentMuted }[tone];
  return (
    <View
      className={cn('flex-row items-center gap-1.5 self-start rounded-selector px-2 py-0.5', BOX[tone])}
      accessibilityLabel={accessibilityLabel ?? label}>
      {icon ? <Ionicons name={icon} size={12} color={iconColor} /> : null}
      <AppText variant="caption" className={TEXT[tone]}>
        {label}
      </AppText>
    </View>
  );
}
