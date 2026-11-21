import { ScrollView } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { useMarkColor } from '@/core/profile/useChildViews';
import { Card, ChildFilterBar } from '@/shared/ui';

import { DayDetails } from './components/DayDetails';
import { MonthGrid } from './components/MonthGrid';
import { MonthHeader } from './components/MonthHeader';
import { MonthTodoList } from './components/MonthTodoList';
import { StageSummary } from './components/StageSummary';
import { TipBlocks } from './components/TipBlocks';
import { useCalendarMonth } from './hooks/useCalendarMonth';

const SafeAreaView = withUniwind(RNSafeAreaView);

// TODO: przesuwanie miesięcy gestem w poziomie (react-native-gesture-handler) – opcjonalne.
export function CalendarScreen() {
  const markColor = useMarkColor();
  const cal = useCalendarMonth();
  const familyColor = markColor('family');

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-base-200">
      <ChildFilterBar items={cal.allChildren} value={cal.filter} onChange={cal.setFilter} />
      <ScrollView contentContainerClassName="gap-4 p-4 pb-8">
        <Card>
          <MonthHeader
            monthStart={cal.monthStart}
            isCurrentMonth={cal.isCurrentMonth}
            onPrev={cal.prevMonth}
            onNext={cal.nextMonth}
            onToday={cal.goToday}
          />
          <StageSummary items={cal.filterChildren} />
          <MonthGrid
            grid={cal.grid}
            marks={cal.marks}
            items={cal.items}
            kids={cal.allChildren}
            markColor={markColor}
            selectedDay={cal.selectedDay}
            onSelectDay={cal.selectDay}
          />
        </Card>
        <MonthTodoList items={cal.items} kids={cal.allChildren} familyColor={familyColor} todoById={cal.todoById} today={cal.today} />
        <TipBlocks tips={cal.tips} kids={cal.allChildren} />
      </ScrollView>
      <DayDetails
        dayKey={cal.selectedDay}
        items={cal.dayItems}
        kids={cal.allChildren}
        familyColor={familyColor}
        todoById={cal.todoById}
        today={cal.today}
        onClose={() => cal.selectDay(null)}
      />
    </SafeAreaView>
  );
}

