import { useEffect, useRef, useState, type ReactElement } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";

import type { ChatMessage } from "@/core/assistant";
import { useThemeColors } from "@/shared/theme";
import { AppText } from "@/shared/ui";

import { MessageBubble } from "./MessageBubble";
import { t } from "../strings";
import { FadeIn } from "./Motion";

export type ListItem =
  | {
      id: string;
      message: ChatMessage;
      /** Element po prawej stronie bańki (np. przycisk „+”). */ trailing?: ReactElement;
      /** Zmiana klucza ponownie odtwarza animację pojawienia się. */ animateKey?: number;
    }
  | { id: string; node: ReactElement };

type Props = {
  messages: ListItem[];
  pending: boolean;
  onAskHuman: () => void;
  /** Id wiadomości asystenta, pod którą ma być przycisk kontaktu z zespołem. */
  humanButtonId?: string;
  header?: ReactElement;
  footer?: ReactElement;
  empty?: ReactElement;
};

export function MessageList({
  messages,
  pending,
  onAskHuman,
  humanButtonId,
  header,
  footer,
  empty,
}: Props) {
  const c = useThemeColors();
  const ref = useRef<FlatList<ListItem>>(null);
  const scrollDown = () => ref.current?.scrollToEnd({ animated: true });
  // Po nowej wiadomości (też odpowiedzi AI) i po zniknięciu wskaźnika pisania przewiń na dół – z opóźnieniem, aż układ się ustabilizuje.
  useEffect(() => {
    const timers = [60, 250].map((ms) =>
      setTimeout(() => ref.current?.scrollToEnd({ animated: true }), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [messages.length, pending]);
  return (
    <FlatList
      ref={ref}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={({ item }) =>
        "node" in item ? (
          item.node
        ) : (
          <FadeKey k={item.animateKey}>
            <View
              className={
                item.message.role === "user"
                  ? "flex-row justify-end"
                  : "flex-row items-start gap-2"
              }
            >
              <MessageBubble
                message={item.message}
                onAskHuman={item.id === humanButtonId ? onAskHuman : undefined}
              />
              {item.trailing ? (
                <View className="ml-auto">{item.trailing}</View>
              ) : null}
            </View>
          </FadeKey>
        )
      }
      contentContainerClassName="grow gap-3 p-4"
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={
        <View className="gap-3">
          {pending ? (
            <View
              className="flex-row items-center gap-2"
              accessibilityLiveRegion="polite"
            >
              <ActivityIndicator color={c.primary} />
              <ThinkingLabel />
            </View>
          ) : null}
          {footer}
        </View>
      }
      onContentSizeChange={scrollDown}
      onLayout={scrollDown}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function FadeKey({ k, children }: { k?: number; children: ReactElement }) {
  return k === undefined ? children : <FadeIn key={k}>{children}</FadeIn>;
}

/** Komunikat oczekiwania, który zmienia się co `t.thinking.intervalMs`. Montowany tylko podczas oczekiwania, więc licznik startuje od zera. */
function ThinkingLabel() {
  const { steps, intervalMs } = t.thinking;
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setStep((s) => (s + 1) % steps.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [steps.length, intervalMs]);
  return (
    <AppText variant="small" tone="muted">
      {steps[step]}
    </AppText>
  );
}
