import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { pl } from '@/shared/i18n/pl';
import { formatMonthYear } from '@/shared/lib/date';
import { useThemeColors } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

type Props = {
  monthStart: Date;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

export function MonthHeader({ monthStart, isCurrentMonth, onPrev, onNext, onToday }: Props) {
  const c = useThemeColors();
  const label = formatMonthYear(monthStart);
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  return (
    <View className="flex-row items-center gap-1">
      <Pressable onPress={onPrev} accessibilityRole="button" accessibilityLabel={pl.calendar.prevMonth} className="size-11 items-center justify-center" hitSlop={6}>
        <Ionicons name="chevron-back" size={24} color={c.primary} />
      </Pressable>
      <AppText variant="heading" className="flex-1 text-center" accessibilityRole="header" accessibilityLiveRegion="polite">
        {title}
      </AppText>
      <Pressable onPress={onNext} accessibilityRole="button" accessibilityLabel={pl.calendar.nextMonth} className="size-11 items-center justify-center" hitSlop={6}>
        <Ionicons name="chevron-forward" size={24} color={c.primary} />
      </Pressable>
      <Button label={pl.calendar.today} variant={isCurrentMonth ? 'ghost' : 'secondary'} compact onPress={onToday} />
    </View>
  );
}

