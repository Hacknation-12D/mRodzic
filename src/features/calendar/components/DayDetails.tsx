import { parseISO } from 'date-fns';

import type { ChildView } from '@/core/profile/useChildViews';
import type { MonthItem, TodoDef } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { formatLongDate } from '@/shared/lib/date';
import { AppText, Sheet } from '@/shared/ui';

import { TodoRow } from './TodoRow';

type Props = {
  dayKey: string | null;
  items: MonthItem[];
  kids: ChildView[];
  familyColor: string;
  todoById: Map<string, TodoDef>;
  today: Date;
  onClose: () => void;
};

/** Lista rzeczy wybranego dnia (po stuknięciu w dzień w siatce). */
export function DayDetails({ dayKey, items, kids, familyColor, todoById, today, onClose }: Props) {
  const title = dayKey ? formatLongDate(parseISO(dayKey)) : undefined;
  return (
    <Sheet visible={dayKey !== null} onClose={onClose} title={title}>
      {items.length === 0 ? <AppText tone="muted">{pl.calendar.dayEmpty}</AppText> : null}
      {items.map((item) => (
        <TodoRow
          key={item.key}
          item={item}
          child={kids.find((c) => c.id === item.childId)}
          familyColor={familyColor}
          todo={todoById.get(item.refId)}
          today={today}
        />
      ))}
    </Sheet>
  );
}
