import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type Props = {
  title: string;
  body?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  action?: ReactNode;
};

export function EmptyState({ title, body, icon = 'leaf-outline', action }: Props) {
  const c = useThemeColors();
  return (
    <View className="items-center gap-2 px-4 py-6" accessibilityRole="summary">
      <Ionicons name={icon} size={36} color={c.baseContentMuted} />
      <AppText variant="subheading" className="text-center">
        {title}
      </AppText>
      {body ? (
        <AppText tone="muted" className="text-center">
          {body}
        </AppText>
      ) : null}
      {action}
    </View>
  );
}
