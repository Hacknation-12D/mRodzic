import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { pl } from '@/shared/i18n/pl';
import { cn } from '@/shared/lib/cn';
import { useThemeColors } from '@/shared/theme';

type Props = { pending: boolean; onSend: (text: string) => void; onStop: () => void };

/** DaisyUI: join (input input-bordered + btn btn-circle). */
export function Composer({ pending, onSend, onStop }: Props) {
  const c = useThemeColors();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View className="flex-row items-end gap-2 border-t border-base-300 bg-base-100 p-2">
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={pl.assistant.placeholder}
        placeholderTextColor={c.baseContentMuted}
        multiline
        maxLength={2000}
        editable={!pending}
        accessibilityLabel={pl.assistant.placeholder}
        className="max-h-36 min-h-11 flex-1 resize-none rounded-box border border-base-300 bg-base-200 px-3 py-2 text-[15px] leading-[21px] text-base-content"
      />
      {pending ? (
        <Pressable onPress={onStop} accessibilityRole="button" accessibilityLabel={pl.assistant.stop} className="size-11 items-center justify-center rounded-full bg-error">
          <Ionicons name="stop" size={20} color={c.errorContent} />
        </Pressable>
      ) : (
        <Pressable
          onPress={submit}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={pl.assistant.send}
          accessibilityState={{ disabled: !canSend }}
          className={cn('size-11 items-center justify-center rounded-full bg-primary', !canSend && 'opacity-40')}>
          <Ionicons name="send" size={18} color={c.primaryContent} />
        </Pressable>
      )}
    </View>
  );
}
