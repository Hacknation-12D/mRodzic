import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { useToday } from "@/core/clock/useToday";
import { useChildViews } from "@/core/profile/useChildViews";
import { pl } from "@/shared/i18n/pl";
import { useThemeColors } from "@/shared/theme";
import { Alert, AppText, Button } from "@/shared/ui";
import type { ChatMessage } from "@/core/assistant";

import { useChatStore } from "./chat.store";
import { ChildContextPicker } from "./components/ChildContextPicker";
import { Composer } from "./components/Composer";
import { HoverPressable } from "./components/Motion";
import { Disclaimer } from "./components/Disclaimer";
import { HandoffSheet } from "./components/HandoffSheet";
import { MessageList, type ListItem } from "./components/MessageList";
import { useContactStore } from "./contact.store";
import { SuggestionList } from "./components/SuggestionList";
import { useSuggestions } from "./suggestions/useSuggestions";
import { t } from "./strings";
import { useAssistantChat } from "./hooks/useAssistantChat";

/** /(tabs)/assistant?docId=…&childId=… */
const SafeAreaView = withUniwind(RNSafeAreaView);

export function AssistantScreen() {
  const c = useThemeColors();
  const today = useToday();
  const kids = useChildViews(today);
  const params = useLocalSearchParams<{ docId?: string; childId?: string }>();

  /** Rozmowa przekazana człowiekowi: e-mail + liczba wiadomości w chwili przekazania (tu wstawiamy komunikat). */
  const [handoff, setHandoff] = useState<{ email: string; at: number } | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [session, setSession] = useState(0);
  const savedEmail = useContactStore((s) => s.email);
  const setSavedEmail = useContactStore((s) => s.setEmail);
  const [childId, setChildId] = useState<string | null>(params.childId ?? null);
  const [docId, setDocId] = useState<string | null>(params.docId ?? null);
  const [prevParams, setPrevParams] = useState(params);

  // Nowe wejście z dokumentu (zmiana parametrów trasy) → ustaw kontekst.
  if (
    prevParams.docId !== params.docId ||
    prevParams.childId !== params.childId
  ) {
    setPrevParams(params);
    setDocId(params.docId ?? null);
    setChildId(params.childId ?? null);
    setHandoff(null);
  }

  const [draft, setDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  // Po wysłaniu wiadomości input zostaje aktywny, ale propozycje wracają dopiero po kliknięciu w input lub wpisaniu tekstu.
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);

  // Historia czatu AI żyje tylko, dopóki użytkownik jest w czacie: wyjście z ekranu resetuje rozmowy.
  useFocusEffect(
    useCallback(() => {
      setSession((k) => k + 1);
      return () => {
        useChatStore.getState().clearAll();
        setHandoff(null);
        setDraft("");
      };
    }, []),
  );

  const validChildId =
    childId && kids.some((k) => k.id === childId) ? childId : null;
  const chat = useAssistantChat(validChildId, docId, handoff?.email ?? null);
  const childName = kids.find((k) => k.id === validChildId)?.name;

  const askedTexts = new Set(
    chat.messages.filter((m) => m.role === "user").map((m) => m.text),
  );
  const suggestions = useSuggestions(
    validChildId,
    chat.focusDoc?.id,
    draft,
    chat.context,
    askedTexts,
  );

  const newChat = () => {
    setHandoff(null);
    setSession((k) => k + 1);
    chat.newChat();
  };

  // Wiadomość powitalna jest wirtualna – nie trafia do historii ani do modelu.
  const greeting = useMemo<ChatMessage>(
    () => ({
      id: "greeting",
      role: "assistant",
      text: t.greeting,
      createdAt: "",
    }),
    [],
  );
  const items = useMemo<ListItem[]>(() => {
    const toItem = (m: ChatMessage): ListItem => ({ id: m.id, message: m });
    const plus = (
      <HoverPressable
        onPress={newChat}
        accessibilityRole="button"
        accessibilityLabel={pl.assistant.newChat}
        hitSlop={8}
        hoverClassName="border-primary bg-primary/10"
        className="size-10 items-center justify-center rounded-full border border-base-300 bg-base-100 active:opacity-70"
      >
        <Ionicons name="add" size={24} color={c.primary} />
      </HoverPressable>
    );
    const list: ListItem[] = [
      { ...toItem(greeting), trailing: plus, animateKey: session },
    ];
    const at = handoff
      ? Math.min(handoff.at, chat.messages.length)
      : chat.messages.length;
    list.push(...chat.messages.slice(0, at).map(toItem));
    // Komunikat o przekazaniu pojawia się raz – w miejscu rozmowy, w którym kliknięto przycisk.
    if (handoff) {
      list.push({
        id: "handoff-notice",
        node: (
          <Alert
            tone="success"
            icon="people-outline"
            title={t.humanRequestedTitle}
          >
            {t.humanRequestedBody(handoff.email)}
          </Alert>
        ),
      });
      list.push(...chat.messages.slice(at).map(toItem));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greeting, chat.messages, handoff, c, validChildId, session]);
  const lastMessage =
    chat.messages.length > 0
      ? chat.messages[chat.messages.length - 1]
      : greeting;
  const humanButtonId =
    !handoff && !chat.pending && lastMessage.role === "assistant"
      ? lastMessage.id
      : undefined;

  const confirmHandoff = async (email: string) => {
    await chat.handOff(email);
    setSavedEmail(email);
    setHandoff({ email, at: chat.messages.length });
    setSheetOpen(false);
    setInputFocused(false);
  };

  const pick = (question: string) => {
    setDraft("");
    setSuggestionsHidden(true);
    void chat.sendCached(question);
  };
  const sendDraft = (text: string) => {
    setDraft("");
    setSuggestionsHidden(true);
    chat.send(text);
  };

  const banner = chat.focusDoc ? (
    <Alert
      tone="info"
      icon="document-text-outline"
      actions={
        <Pressable
          onPress={() => setDocId(null)}
          accessibilityRole="button"
          accessibilityLabel={pl.assistant.closeContext}
          hitSlop={8}
          className="size-6 items-center justify-center"
        >
          <Ionicons name="close" size={18} color={c.info} />
        </Pressable>
      }
    >
      {pl.assistant.contextBanner(chat.focusDoc.title, childName)}
    </Alert>
  ) : null;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-base-200">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View className="gap-2 px-4 pt-2">
          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1">
              <ChildContextPicker
                kids={kids}
                value={validChildId}
                onChange={setChildId}
              />
            </View>
          </View>
          {banner}
        </View>

        <MessageList
          messages={items}
          pending={chat.pending}
          humanButtonId={humanButtonId}
          onAskHuman={() => setSheetOpen(true)}
          footer={
            <View className="gap-2">
              {chat.error ? (
                <View className="flex-row items-center gap-2">
                  <AppText tone="danger" variant="small" className="flex-1">
                    {chat.error}
                  </AppText>
                  {chat.canRetry ? (
                    <Button
                      label={pl.common.retry}
                      variant="secondary"
                      compact
                      icon="refresh"
                      onPress={chat.retry}
                    />
                  ) : null}
                </View>
              ) : null}
            </View>
          }
        />
        <Disclaimer />
        {handoff ? (
          <View className="px-3 pb-2 pt-1">
            <Alert tone="info" icon="time-outline">
              <View className="flex-row items-center gap-3">
                <AppText variant="small" className="flex-1">
                  {t.waitingBar(handoff.email)}
                </AppText>
                <Button
                  label={t.backToAi}
                  variant="secondary"
                  compact
                  icon="sparkles-outline"
                  onPress={() => setHandoff(null)}
                />
              </View>
            </Alert>
          </View>
        ) : chat.pending || !inputFocused || suggestionsHidden ? null : (
          // Zerowa wysokość + absolutne pozycjonowanie: propozycje nachodzą na wiadomości, więc lista nie skacze przy zmianie ich liczby.
          <View className="z-10 h-0" style={{ elevation: 10 }}>
            <View className="absolute inset-x-0 bottom-0">
              <SuggestionList items={suggestions} onPick={pick} />
            </View>
          </View>
        )}
        <Composer
          value={draft}
          onChange={(text) => {
            setDraft(text);
            if (text.length > 0) setSuggestionsHidden(false);
          }}
          pending={chat.pending}
          onSend={sendDraft}
          onStop={chat.stop}
          onFocusChange={(focused) => {
            setInputFocused(focused);
            if (focused) setSuggestionsHidden(false);
          }}
          placeholder={handoff ? t.humanPlaceholder : undefined}
        />
        <HandoffSheet
          key={sheetOpen ? "open" : "closed"}
          visible={sheetOpen}
          initialEmail={savedEmail}
          onClose={() => setSheetOpen(false)}
          onConfirm={confirmHandoff}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
