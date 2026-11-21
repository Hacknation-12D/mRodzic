import { useState } from 'react';
import { View } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import type { TipForChild } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Card, ChildChip, Markdown, Sheet } from '@/shared/ui';

/** Usuwa proste znaczniki markdown na potrzeby skrótu (2–3 linie). */
function plain(md: string): string {
  return md.replace(/[*_#>`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

type Props = { tip: TipForChild; child?: ChildView };

export function TipCard({ tip, child }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card onPress={() => setOpen(true)} accentColor={child?.color} accessibilityLabel={`${tip.title}. ${pl.calendar.readMore}`}>
        <AppText variant="subheading">{tip.title}</AppText>
        <AppText tone="muted" numberOfLines={3}>
          {plain(tip.summaryMd)}
        </AppText>
        <View className="flex-row items-center justify-between gap-2">
          {child ? <ChildChip compact name={child.name} color={child.color} /> : null}
          <AppText variant="small" tone="primary">
            {pl.calendar.readMore} →
          </AppText>
        </View>
      </Card>
      <Sheet visible={open} onClose={() => setOpen(false)} title={tip.title}>
        {child ? <ChildChip compact name={child.name} color={child.color} /> : null}
        <Markdown>{tip.bodyMd ?? tip.summaryMd}</Markdown>
        {tip.source ? (
          <AppText variant="small" tone="muted">
            {pl.documents.source(tip.source.name, tip.source.asOf)}
          </AppText>
        ) : null}
      </Sheet>
    </>
  );
}

