import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

export type AlertTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

type Props = {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  icon?: ComponentProps<typeof Ionicons>['name'];
  /** Elementy po prawej (np. przycisk). */
  actions?: ReactNode;
  className?: string;
};

const BOX: Record<AlertTone, string> = {
  info: 'bg-info-soft border-info',
  success: 'bg-success-soft border-success',
  warning: 'bg-warning-soft border-warning',
  error: 'bg-error-soft border-error',
  neutral: 'bg-neutral-soft border-base-300',
};

const ICON: Record<AlertTone, ComponentProps<typeof Ionicons>['name']> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'warning-outline',
  error: 'alert-circle-outline',
  neutral: 'information-circle-outline',
};

/** DaisyUI: alert alert-soft alert-{info|success|warning|error}. */
export function Alert({ tone = 'info', title, children, icon, actions, className }: Props) {
  const c = useThemeColors();
  const color = { info: c.info, success: c.success, warning: c.warning, error: c.error, neutral: c.baseContentMuted }[tone];
  return (
    <View className={cn('flex-row items-start gap-3 rounded-box border p-3', BOX[tone], className)} accessibilityRole="alert">
      <Ionicons name={icon ?? ICON[tone]} size={20} color={color} />
      <View className="flex-1 gap-1">
        {title ? <AppText variant="bodyStrong">{title}</AppText> : null}
        {typeof children === 'string' ? <AppText variant="small">{children}</AppText> : children}
      </View>
      {actions}
    </View>
  );
}
