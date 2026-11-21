import { addDays, addMonths, endOfMonth, endOfWeek, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { useMemo, useState } from 'react';

import { dateKey, getDeadlineMarks, getMonthItems, getTipsFor } from '@/core/content/selectors';
import { useContentData } from '@/core/content/useContentData';
import { useChildViews, type ChildView } from '@/core/profile/useChildViews';
import type { MarkKey, MonthItem, TodoDef } from '@/core/types';

export type GridDay = { date: Date; key: string; inMonth: boolean; isToday: boolean };

/** Siatka miesiąca (tydzień od poniedziałku), 5–6 wierszy. */
export function buildMonthGrid(monthStart: Date, today: Date): GridDay[] {
  const start = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days: GridDay[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) {
    days.push({ date: d, key: dateKey(d), inMonth: isSameMonth(d, monthStart), isToday: isSameDay(d, today) });
  }
  return days;
}

export function useCalendarMonth() {
  const { bundle, profile, statuses, today, filter, setFilter } = useContentData();
  const [offset, setOffset] = useState(0); // przesunięcie w miesiącach względem „dzisiaj”
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const monthStart = useMemo(() => startOfMonth(addMonths(today, offset)), [today, offset]);
  // „środek miesiąca” – dla etapów i poradników (w bieżącym miesiącu: dzisiaj)
  const focusDate = useMemo(() => (offset === 0 ? today : addDays(monthStart, 14)), [offset, today, monthStart]);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth() + 1;

  const allChildren = useChildViews(focusDate);
  const filterChildren: ChildView[] = filter === 'all' ? allChildren : allChildren.filter((c) => c.id === filter);

  const grid = useMemo(() => buildMonthGrid(monthStart, today), [monthStart, today]);

  const items: MonthItem[] = useMemo(
    () => (profile ? getMonthItems(bundle, profile, statuses, year, month, filter, today) : []),
    [bundle, profile, statuses, year, month, filter, today],
  );

  const marks: Record<string, MarkKey[]> = useMemo(
    () => (profile ? getDeadlineMarks(bundle, profile, statuses, year, month, filter, today) : {}),
    [bundle, profile, statuses, year, month, filter, today],
  );

  const tips = useMemo(() => (profile ? getTipsFor(bundle, profile, focusDate, filter, 3) : []), [bundle, profile, focusDate, filter]);

  const todoById = useMemo(() => new Map<string, TodoDef>(bundle.todos.map((t) => [t.id, t])), [bundle]);

  const dayItems = useMemo(
    () => (selectedDay ? items.filter((i) => i.date && dateKey(i.date) === selectedDay) : []),
    [items, selectedDay],
  );

  return {
    today,
    monthStart,
    isCurrentMonth: offset === 0,
    grid,
    marks,
    items,
    tips,
    todoById,
    allChildren,
    filterChildren,
    filter,
    setFilter,
    selectedDay,
    dayItems,
    selectDay: setSelectedDay,
    prevMonth: () => setOffset((o) => o - 1),
    nextMonth: () => setOffset((o) => o + 1),
    goToday: () => setOffset(0),
  };
}
