import { View } from 'react-native';

import { pl } from '@/shared/i18n/pl';
import { AppText } from '@/shared/ui';

type Props = { step: number; total: number; title: string; intro?: string };

/** DaisyUI: progress progress-primary + tytuł kroku. */
export function StepProgress({ step, total, title, intro }: Props) {
  const label = pl.onboarding.stepOf(step, total);
  return (
    <View className="gap-2">
      <AppText variant="caption" tone="muted" accessibilityLabel={label}>
        {label}
      </AppText>
      <View
        className="h-1.5 overflow-hidden rounded-full bg-neutral-soft"
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: total, now: step }}>
        <View className="h-1.5 rounded-full bg-primary" style={{ width: `${(step / total) * 100}%` }} />
      </View>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {intro ? <AppText tone="muted">{intro}</AppText> : null}
    </View>
  );
}
