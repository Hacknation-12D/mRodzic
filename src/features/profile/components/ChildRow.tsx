import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText, Button, ChildDot } from '@/shared/ui';

type Props = {
  child: ChildView;
  onPress: () => void;
  onMarkBorn: () => void;
};

export function ChildRow({ child, onPress, onMarkBorn }: Props) {
  const c = useThemeColors();
  return (
    <View className="gap-2 border-b border-base-300 py-2">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${child.name}, ${child.stageLabel}. ${pl.profile.editChild}`}
        className="min-h-11 flex-row items-center gap-3">
        <ChildDot name={child.name} color={child.color} size={32} />
        <View className="flex-1">
          <AppText variant="bodyStrong">{child.name}</AppText>
          <AppText variant="small" tone="muted">
            {child.stageLabel}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={c.baseContentMuted} />
      </Pressable>
      {child.status === 'expected' ? <Button label={pl.profile.markBorn} icon="sparkles-outline" onPress={onMarkBorn} /> : null}
    </View>
  );
}

