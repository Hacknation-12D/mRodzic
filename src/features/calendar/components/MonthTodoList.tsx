import { View } from 'react-native';

import type { ChildView } from '@/core/profile/useChildViews';
import type { MonthItem, TodoDef } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Card, EmptyState } from '@/shared/ui';

import { TodoRow } from './TodoRow';

type Props = {
  items: MonthItem[];
  kids: ChildView[];
  familyColor: string;
  todoById: Map<string, TodoDef>;
  today: Date;
};

/** „W tym miesiącu warto”: najpierw terminy, potem zadania. */
export function MonthTodoList({ items, kids, familyColor, todoById, today }: Props) {
  const childOf = (id?: string) => kids.find((c) => c.id === id);
  const deadlines = items.filter((i) => i.kind === 'deadline');
  const todos = items.filter((i) => i.kind === 'todo');

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">
        {pl.calendar.monthTodos}
      </AppText>
      {items.length === 0 ? <EmptyState icon="sunny-outline" title={pl.calendar.empty} /> : null}
      {deadlines.length > 0 ? (
        <View className="mt-2 gap-0.5">
          <AppText variant="caption" tone="muted">
            {pl.calendar.deadlines.toUpperCase()}
          </AppText>
          {deadlines.map((item) => (
            <TodoRow key={item.key} item={item} child={childOf(item.childId)} familyColor={familyColor} today={today} />
          ))}
        </View>
      ) : null}
      {todos.length > 0 ? (
        <View className="mt-2 gap-0.5">
          <AppText variant="caption" tone="muted">
            {pl.calendar.todos.toUpperCase()}
          </AppText>
          {todos.map((item) => (
            <TodoRow key={item.key} item={item} child={childOf(item.childId)} familyColor={familyColor} todo={todoById.get(item.refId)} today={today} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

