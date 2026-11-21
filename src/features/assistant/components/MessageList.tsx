import { useRef, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import type { ChatMessage } from '@/core/assistant';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { MessageBubble } from './MessageBubble';

type Props = {
  messages: ChatMessage[];
  pending: boolean;
  onAskHuman: () => void;
  header?: ReactElement;
  footer?: ReactElement;
  empty?: ReactElement;
};

export function MessageList({ messages, pending, onAskHuman, header, footer, empty }: Props) {
  const c = useThemeColors();
  const ref = useRef<FlatList<ChatMessage>>(null);
  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) => <MessageBubble message={item} onAskHuman={onAskHuman} />}
      contentContainerClassName="grow gap-3 p-4"
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        <View className="gap-3">
          {pending ? (
            <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite" accessibilityLabel={pl.assistant.typing}>
              <ActivityIndicator color={c.primary} />
              <AppText variant="small" tone="muted">
                {pl.assistant.typing}
              </AppText>
            </View>
          ) : null}
          {footer}
        </View>
      }
      onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
      keyboardShouldPersistTaps="handled"
    />
  );
}

