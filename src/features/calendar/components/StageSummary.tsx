import { View } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import { AppText, ChildDot } from '@/shared/ui';

/** „Zosia: 4. miesiąc życia · Maluszek: 30. tydzień ciąży” dla środka wyświetlanego miesiąca. */
export function StageSummary({ items }: { items: ChildView[] }) {
  return (
    <View className="flex-row flex-wrap gap-3" accessible accessibilityLabel={items.map((c) => `${c.name}: ${c.stageLabel}`).join(', ')}>
      {items.map((c) => (
        <View key={c.id} className="flex-row items-center gap-1">
          <ChildDot name={c.name} color={c.color} size={18} />
          <AppText variant="small">
            <AppText variant="small" className="font-bold">
              {c.name}:
            </AppText>{' '}
            {c.stageLabel}
          </AppText>
        </View>
      ))}
    </View>
  );
}

