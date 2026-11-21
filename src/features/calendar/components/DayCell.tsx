import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '@/shared/lib/cn';
import { AppText } from '@/shared/ui';

type Props = {
  day: number;
  inMonth: boolean;
  isToday: boolean;
  selected: boolean;
  dotColors: string[];
  accessibilityLabel: string;
  onPress: () => void;
};

export const DayCell = memo(function DayCell({ day, inMonth, isToday, selected, dotColors, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      className="min-h-13 flex-1 items-center py-0.5">
      <View
        className={cn(
          'size-[34px] items-center justify-center rounded-full',
          isToday && 'bg-primary',
          selected && !isToday && 'border-2 border-primary',
        )}>
        <AppText variant="body" tone={isToday ? 'inverse' : inMonth ? 'default' : 'muted'} className={cn(isToday && 'font-bold', !inMonth && 'opacity-50')}>
          {day}
        </AppText>
      </View>
      <View className="mt-0.5 h-[7px] flex-row gap-[3px]">
        {dotColors.map((color, i) => (
          <View key={`${color}${i}`} className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        ))}
      </View>
    </Pressable>
  );
});

