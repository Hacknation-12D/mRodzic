import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

export function Disclaimer() {
  const c = useThemeColors();
  return (
    <View className="flex-row items-center gap-1 px-4 py-1">
      <Ionicons name="information-circle-outline" size={14} color={c.baseContentMuted} />
      <AppText variant="caption" tone="muted" className="flex-1">
        {pl.assistant.disclaimer}
      </AppText>
    </View>
  );
}

