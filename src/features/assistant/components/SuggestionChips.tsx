import { View } from 'react-native';

import { Chip } from '@/shared/ui';

export function SuggestionChips({ items, onPick }: { items: string[]; onPick: (text: string) => void }) {
  if (items.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((text) => (
        <Chip key={text} label={text} onPress={() => onPick(text)} />
      ))}
    </View>
  );
}

