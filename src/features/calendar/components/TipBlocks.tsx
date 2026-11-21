import { View } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import type { TipForChild } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText } from '@/shared/ui';

import { TipCard } from './TipCard';

/** 3 karty poradników dopasowanych do etapu dzieci. */
export function TipBlocks({ tips, kids }: { tips: TipForChild[]; kids: ChildView[] }) {
  return (
    <View className="gap-3">
      <AppText variant="heading" accessibilityRole="header">
        {pl.calendar.tips}
      </AppText>
      {tips.length === 0 ? <AppText tone="muted">{pl.calendar.noTips}</AppText> : null}
      {tips.map((tip) => (
        <TipCard key={`${tip.id}:${tip.childId ?? ''}`} tip={tip} child={kids.find((c) => c.id === tip.childId)} />
      ))}
    </View>
  );
}

