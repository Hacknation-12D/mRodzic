import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { useThemeColors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { t } from '../strings';

/** Do 3 proponowanych pytań nad polem wpisywania. */
export function SuggestionList({ items, onPick }: { items: string[]; onPick: (q: string) => void }) {
  const c = useThemeColors();
  if (items.length === 0) return null;
  return (
    <View className="gap-1.5 px-3 pb-2 pt-1" accessibilityLabel={t.suggestionsTitle}>
      {items.map((q) => (
        <Pressable
          key={q}
          onPress={() => onPick(q)}
          accessibilityRole="button"
          className="flex-row items-center gap-2 rounded-field border border-base-300 bg-base-100 px-3 py-2 active:opacity-70">
          <Ionicons name="flash-outline" size={16} color={c.primary} />
          <AppText variant="small" className="flex-1" numberOfLines={2}>
            {q}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
