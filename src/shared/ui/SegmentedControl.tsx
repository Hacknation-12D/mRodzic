import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { AppText } from './AppText';

export type Segment<T extends string> = { value: T; label: string; badge?: number };

type Props<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/** DaisyUI: tabs tabs-box. */
export function SegmentedControl<T extends string>({ segments, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View className="flex-row gap-0.5 rounded-field bg-neutral-soft p-1" accessibilityRole="tablist" accessibilityLabel={accessibilityLabel}>
      {segments.map((s) => {
        const selected = s.value === value;
        const label = s.badge !== undefined ? `${s.label} (${s.badge})` : s.label;
        return (
          <Pressable
            key={s.value}
            onPress={() => onChange(s.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
            className={cn(
              'min-h-10 flex-1 items-center justify-center rounded-field px-1',
              selected && 'border border-base-300 bg-base-100',
            )}>
            <AppText variant="small" numberOfLines={2} tone={selected ? 'default' : 'muted'} className={cn('text-center', selected ? 'font-bold' : 'font-medium')}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
