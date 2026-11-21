import Ionicons from '@expo/vector-icons/Ionicons';
import { differenceInCalendarDays } from 'date-fns';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { deadlineLabel, urgencyTone } from '@/core/content/format';
import { goToDocument } from '@/core/navigation/routes';
import type { ChildView } from '@/core/profile/useChildViews';
import type { MonthItem, TodoDef } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText, Badge, ChildChip, Markdown } from '@/shared/ui';

type Props = {
  item: MonthItem;
  child?: ChildView;
  familyColor: string;
  todo?: TodoDef;
  today: Date;
};

export function TodoRow({ item, child, familyColor, todo, today }: Props) {
  const c = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const docId = item.kind === 'deadline' ? item.refId : item.relatedDocumentId;
  const daysLeft = item.date ? differenceInCalendarDays(item.date, today) : undefined;
  const label = item.date ? deadlineLabel(daysLeft, item.date) : undefined;
  const canExpand = item.kind === 'todo' && Boolean(todo?.descriptionMd);

  const onPress = () => {
    if (canExpand) setExpanded((e) => !e);
    else if (docId) goToDocument(docId, item.childId);
  };

  return (
    <View className="border-b border-base-300">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={canExpand ? { expanded } : undefined}
        accessibilityLabel={`${item.title}, ${child?.name ?? pl.common.wholeFamily}${label ? `, ${label}` : ''}${item.done ? `, ${pl.calendar.done}` : ''}`}
        className="min-h-11 flex-row items-center gap-3 py-2">
        <Ionicons
          name={item.done ? 'checkmark-circle' : item.kind === 'deadline' ? 'flag-outline' : 'ellipse-outline'}
          size={20}
          color={item.done ? c.success : c.baseContentMuted}
        />
        <View className="flex-1 gap-1">
          <AppText variant="bodyStrong" className={item.done ? 'line-through opacity-70' : undefined}>
            {item.title}
          </AppText>
          <View className="flex-row flex-wrap items-center gap-2">
            <ChildChip compact name={child?.name ?? pl.common.wholeFamily} color={child?.color ?? familyColor} />
            {label ? <Badge label={label} tone={item.done ? 'success' : urgencyTone(item.urgency)} /> : null}
          </View>
        </View>
        {canExpand || docId ? <Ionicons name={canExpand ? (expanded ? 'chevron-up' : 'chevron-down') : 'chevron-forward'} size={18} color={c.baseContentMuted} /> : null}
      </Pressable>
      {expanded && todo?.descriptionMd ? (
        <View className="pb-2 pl-8">
          <Markdown>{todo.descriptionMd}</Markdown>
          {docId ? (
            <Pressable onPress={() => goToDocument(docId, item.childId)} accessibilityRole="link" className="min-h-11 justify-center">
              <AppText tone="primary" variant="bodyStrong">
                {pl.calendar.readMore} →
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

