import { View } from 'react-native';

import { dateKey } from '@/core/content/selectors';
import type { ChildView } from '@/core/profile/useChildViews';
import type { MarkKey, MonthItem } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { formatDayMonth, weekdayShortNames } from '@/shared/lib/date';
import { AppText } from '@/shared/ui';

import type { GridDay } from '../hooks/useCalendarMonth';
import { DayCell } from './DayCell';

type Props = {
  grid: GridDay[];
  marks: Record<string, MarkKey[]>;
  items: MonthItem[];
  kids: ChildView[];
  markColor: (key: MarkKey) => string;
  selectedDay: string | null;
  onSelectDay: (key: string) => void;
};

const WEEKDAYS = weekdayShortNames();

export function MonthGrid({ grid, marks, items, kids, markColor, selectedDay, onSelectDay }: Props) {
  const nameOf = (childId?: string) => kids.find((c) => c.id === childId)?.name ?? pl.common.wholeFamily;
  const weeks: GridDay[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  return (
    <View className="gap-0.5">
      <View className="flex-row" importantForAccessibility="no-hide-descendants">
        {WEEKDAYS.map((d) => (
          <AppText key={d} variant="caption" tone="muted" className="flex-1 text-center">
            {d}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].key} className="flex-row">
          {week.map((day) => {
            const dayItems = items.filter((i) => i.date && dateKey(i.date) === day.key);
            const desc = dayItems.map((i) => `${i.title} – ${nameOf(i.childId)}`).join(', ');
            const dateLabel = `${formatDayMonth(day.date)}${day.isToday ? `, ${pl.calendar.todayA11y}` : ''}`;
            return (
              <DayCell
                key={day.key}
                day={day.date.getDate()}
                inMonth={day.inMonth}
                isToday={day.isToday}
                selected={selectedDay === day.key}
                dotColors={(marks[day.key] ?? []).map(markColor)}
                accessibilityLabel={pl.calendar.dayA11y(dateLabel, dayItems.length, desc)}
                onPress={() => onSelectDay(day.key)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

