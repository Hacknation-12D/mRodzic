import { View } from 'react-native';

import type { ChatMessage } from '@/core/assistant';
import { pl } from '@/shared/i18n/pl';
import { cn } from '@/shared/lib/cn';
import { AppText, Badge, Button, Markdown } from '@/shared/ui';

import { SourcesList } from './SourcesList';

type Props = { message: ChatMessage; onAskHuman: () => void };

/** DaisyUI: chat chat-end + chat-bubble-primary (użytkownik) / chat-start + chat-bubble (asystent). */
export function MessageBubble({ message, onAskHuman }: Props) {
  const isUser = message.role === 'user';
  return (
    <View
      className={cn(
        'max-w-[88%] gap-1 rounded-box px-3 py-2',
        isUser ? 'self-end rounded-br-sm bg-primary' : 'self-start rounded-bl-sm border border-base-300 bg-base-100',
      )}>
      {isUser ? (
        <AppText tone="inverse">{message.text}</AppText>
      ) : (
        <>
          {message.usedFallback ? <Badge label={pl.assistant.fallbackNotice} tone="warning" icon="cloud-offline-outline" /> : null}
          <Markdown>{message.text}</Markdown>
          <SourcesList sources={message.sources ?? []} />
          {message.suggestHuman ? <Button label={pl.assistant.switchToHuman} variant="secondary" icon="person-outline" compact onPress={onAskHuman} /> : null}
        </>
      )}
    </View>
  );
}
