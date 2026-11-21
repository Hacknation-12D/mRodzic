import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { deadlineLabel } from '@/core/content/format';
import { getChildColor } from '@/core/profile/childColors';
import type { ChildView } from '@/core/profile/useChildViews';
import type { DocumentInstance, DocumentStatus } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { formatTime } from '@/shared/lib/date';
import { useIsDark, useThemeColors } from '@/shared/theme';
import { AppText, Button, Card, ChildChip, Sheet } from '@/shared/ui';

import { DeadlineBadge } from './DeadlineBadge';
import { EligibilityBadge } from './EligibilityBadge';

type Props = {
  instance: DocumentInstance;
  child?: ChildView;
  onOpen: () => void;
  onChangeStatus: (status: DocumentStatus) => void;
};

export function DocumentCard({ instance, child, onOpen, onChangeStatus }: Props) {
  const c = useThemeColors();
  const isDark = useIsDark();
  const [menuOpen, setMenuOpen] = useState(false);
  const accent = child?.color ?? getChildColor('family', isDark);
  const who = child?.name ?? pl.common.wholeFamily;
  const a11y = `${instance.title}, ${who}, ${deadlineLabel(instance.daysLeft, instance.deadlineDate)}`;

  const act = (status: DocumentStatus) => {
    setMenuOpen(false);
    onChangeStatus(status);
  };

  return (
    // Card bez onPress: na web przycisk nie może zawierać innych przycisków (menu, „Przywróć”).
    <Card accentColor={accent}>
      <View className="flex-row items-start gap-2">
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={a11y} className="flex-1 gap-2 active:opacity-80">
          <AppText variant="subheading">{instance.title}</AppText>
          <View className="flex-row flex-wrap items-center gap-2">
            <ChildChip compact name={who} color={accent} />
            {instance.amountLabel ? (
              <AppText variant="small" tone="muted">
                {instance.amountLabel}
              </AppText>
            ) : null}
          </View>
          {instance.status === 'todo' ? (
            <View className="flex-row flex-wrap items-center gap-2">
              <DeadlineBadge daysLeft={instance.daysLeft} deadlineDate={instance.deadlineDate} urgency={instance.urgency} />
              <EligibilityBadge result={instance.eligibility} />
            </View>
          ) : instance.statusUpdatedAt ? (
            <AppText variant="small" tone="muted">
              {pl.documents.statusChangedAt(formatTime(instance.statusUpdatedAt))}
            </AppText>
          ) : null}
        </Pressable>
        <Pressable
          onPress={() => setMenuOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${pl.documents.moreActions}: ${instance.title}`}
          hitSlop={8}
          className="min-h-8 min-w-11 items-end justify-start">
          <Ionicons name="ellipsis-horizontal" size={20} color={c.baseContentMuted} />
        </Pressable>
      </View>
      {instance.status !== 'todo' ? <Button label={pl.documents.restore} variant="secondary" icon="arrow-undo-outline" compact onPress={() => onChangeStatus('todo')} /> : null}

      <Sheet visible={menuOpen} onClose={() => setMenuOpen(false)} title={instance.title}>
        {instance.status === 'todo' ? (
          <>
            <Button label={pl.documents.markDone} icon="checkmark-done-outline" onPress={() => act('done')} />
            <Button label={pl.documents.hide} variant="secondary" icon="eye-off-outline" onPress={() => act('hidden')} />
          </>
        ) : (
          <Button label={pl.documents.restore} icon="arrow-undo-outline" onPress={() => act('todo')} />
        )}
      </Sheet>
    </Card>
  );
}

