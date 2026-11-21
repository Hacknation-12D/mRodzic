import { View } from 'react-native';

import type { DocumentStatus } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { Button } from '@/shared/ui';

type Props = {
  status: DocumentStatus;
  onChangeStatus: (status: DocumentStatus) => void;
  onAskAssistant: () => void;
};

export function DocumentActions({ status, onChangeStatus, onAskAssistant }: Props) {
  return (
    <View className="gap-2">
      {status === 'todo' ? (
        <View className="flex-row flex-wrap gap-2">
          <Button label={pl.documents.markDone} icon="checkmark-done-outline" onPress={() => onChangeStatus('done')} className="grow" />
          <Button label={pl.documents.hide} variant="ghost" icon="eye-off-outline" onPress={() => onChangeStatus('hidden')} className="grow" />
        </View>
      ) : (
        <Button label={pl.documents.restore} icon="arrow-undo-outline" onPress={() => onChangeStatus('todo')} />
      )}
      <Button label={pl.documents.askAssistant} variant="secondary" icon="chatbubbles-outline" onPress={onAskAssistant} />
    </View>
  );
}

