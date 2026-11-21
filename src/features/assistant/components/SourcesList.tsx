import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import type { Source } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { openExternalLink } from '@/shared/lib/links';
import { useThemeColors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

export function SourcesList({ sources }: { sources: Source[] }) {
  const c = useThemeColors();
  if (sources.length === 0) return null;
  return (
    <View className="mt-1 gap-0.5">
      <AppText variant="caption" tone="muted">
        {pl.assistant.sources}
      </AppText>
      {sources.map((s) => {
        const label = s.asOf ? `${s.name} (${s.asOf})` : s.name;
        return s.url ? (
          <Pressable key={label} onPress={() => void openExternalLink(s.url as string)} accessibilityRole="link" accessibilityLabel={label} className="min-h-7 flex-row items-center gap-1">
            <Ionicons name="link-outline" size={14} color={c.primary} />
            <AppText variant="small" tone="primary" className="shrink underline">
              {label}
            </AppText>
          </Pressable>
        ) : (
          <AppText key={label} variant="small" tone="muted">
            {label}
          </AppText>
        );
      })}
    </View>
  );
}

