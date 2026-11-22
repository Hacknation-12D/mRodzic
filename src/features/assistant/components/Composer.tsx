import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, type ComponentRef } from "react";
import { Platform, Pressable, TextInput, View } from "react-native";

import { pl } from "@/shared/i18n/pl";
import { cn } from "@/shared/lib/cn";
import { useThemeColors } from "@/shared/theme";
import { AppText } from "@/shared/ui";

import { INPUT_COUNTER_FROM, MAX_INPUT_CHARS } from "../limits";

type Props = {
  value: string;
  onChange: (text: string) => void;
  pending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onFocusChange?: (focused: boolean) => void;
  placeholder?: string;
};

/** DaisyUI: join (input input-bordered + btn btn-circle). */
export function Composer({
  value: text,
  onChange: setText,
  pending,
  onSend,
  onStop,
  onFocusChange,
  placeholder,
}: Props) {
  const c = useThemeColors();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canSend = text.trim().length > 0 && !pending;

  const submit = () => {
    if (!canSend) return;
    onSend(text);
    setText("");
  };

  return (
    <View className="border-t border-base-300 bg-base-100 p-2">
      {text.length >= INPUT_COUNTER_FROM ? (
        <AppText
          variant="small"
          tone={text.length >= MAX_INPUT_CHARS ? "danger" : "muted"}
          className="mb-1 self-end px-1"
          accessibilityLiveRegion="polite"
        >
          {pl.assistant.charsLeft(MAX_INPUT_CHARS - text.length)}
        </AppText>
      ) : null}
      <View className="flex-row items-end gap-2">
        <TextInput
          ref={inputRef}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current);
            onFocusChange?.(true);
          }}
          // Lekkie opóźnienie, żeby kliknięcie w propozycję zdążyło się wykonać przed ukryciem listy.
          onBlur={() => {
            blurTimer.current = setTimeout(() => onFocusChange?.(false), 150);
          }}
          // Kliknięcie w już aktywny input też ma pokazać propozycje.
          onPressIn={() => onFocusChange?.(true)}
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? pl.assistant.placeholder}
          placeholderTextColor={c.baseContentMuted}
          multiline
          maxLength={MAX_INPUT_CHARS}
          // Enter wysyła wiadomość (na mobile klawisz „Wyślij”; w przeglądarce Shift+Enter = nowa linia).
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={submit}
          onKeyPress={
            Platform.OS === "web"
              ? (e) => {
                  const ev = e.nativeEvent as unknown as {
                    key: string;
                    shiftKey?: boolean;
                  };
                  if (ev.key === "Enter" && !ev.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }
              : undefined
          }
          accessibilityLabel={pl.assistant.placeholder}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-box border border-base-300 bg-base-200 px-3 py-2 text-[15px] leading-[21px] text-base-content"
        />
        {pending ? (
          <Pressable
            onPress={onStop}
            accessibilityRole="button"
            accessibilityLabel={pl.assistant.stop}
            className="size-11 items-center justify-center rounded-full bg-error"
          >
            <Ionicons name="stop" size={20} color={c.errorContent} />
          </Pressable>
        ) : (
          <Pressable
            onPress={submit}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel={pl.assistant.send}
            accessibilityState={{ disabled: !canSend }}
            className={cn(
              "size-11 items-center justify-center rounded-full bg-primary",
              !canSend && "opacity-40",
            )}
          >
            <Ionicons name="send" size={18} color={c.primaryContent} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
