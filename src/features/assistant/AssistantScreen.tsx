import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { useToday } from '@/core/clock/useToday';
import { useChildViews } from '@/core/profile/useChildViews';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Button, EmptyState } from '@/shared/ui';

import { ChildContextPicker } from './components/ChildContextPicker';
import { Composer } from './components/Composer';
import { Disclaimer } from './components/Disclaimer';
import { HumanContactForm } from './components/HumanContactForm';
import { MessageList } from './components/MessageList';
import { ModeSwitch, type AssistantMode } from './components/ModeSwitch';
import { SuggestionChips } from './components/SuggestionChips';
import { useAssistantChat } from './hooks/useAssistantChat';

/** /(tabs)/assistant?docId=…&childId=… */
const SafeAreaView = withUniwind(RNSafeAreaView);

export function AssistantScreen() {
  const c = useThemeColors();
  const today = useToday();
  const kids = useChildViews(today);
  const params = useLocalSearchParams<{ docId?: string; childId?: string }>();

  const [mode, setMode] = useState<AssistantMode>('ai');
  const [childId, setChildId] = useState<string | null>(params.childId ?? null);
  const [docId, setDocId] = useState<string | null>(params.docId ?? null);
  const [prevParams, setPrevParams] = useState(params);

  // Nowe wejście z dokumentu (zmiana parametrów trasy) → ustaw kontekst.
  if (prevParams.docId !== params.docId || prevParams.childId !== params.childId) {
    setPrevParams(params);
    setDocId(params.docId ?? null);
    setChildId(params.childId ?? null);
    setMode('ai');
  }

  const validChildId = childId && kids.some((k) => k.id === childId) ? childId : null;
  const chat = useAssistantChat(validChildId, docId);
  const childName = kids.find((k) => k.id === validChildId)?.name;

  const askedTexts = new Set(chat.messages.filter((m) => m.role === 'user').map((m) => m.text));
  const freshSuggestions = chat.suggestions.filter((s) => !askedTexts.has(s));

  const banner = chat.focusDoc ? (
    <Alert
      tone="info"
      icon="document-text-outline"
      actions={
        <Pressable onPress={() => setDocId(null)} accessibilityRole="button" accessibilityLabel={pl.assistant.closeContext} hitSlop={8} className="size-6 items-center justify-center">
          <Ionicons name="close" size={18} color={c.info} />
        </Pressable>
      }>
      {pl.assistant.contextBanner(chat.focusDoc.title, childName)}
    </Alert>
  ) : null;

  return (
    <SafeAreaView edges={[]} className="flex-1 bg-base-200">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        <View className="gap-2 px-4 pt-2">
          <ModeSwitch value={mode} onChange={setMode} />
          <ChildContextPicker kids={kids} value={validChildId} onChange={setChildId} />
          {banner}
        </View>

        {mode === 'ai' ? (
          <>
            <MessageList
              messages={chat.messages}
              pending={chat.pending}
              onAskHuman={() => setMode('human')}
              empty={
                <View className="gap-3">
                  <EmptyState icon="chatbubbles-outline" title={pl.assistant.emptyTitle} body={pl.assistant.emptyBody} />
                  <SuggestionChips items={freshSuggestions} onPick={chat.send} />
                </View>
              }
              footer={
                <View className="gap-2">
                  {chat.error ? (
                    <View className="flex-row items-center gap-2">
                      <AppText tone="danger" variant="small" className="flex-1">
                        {chat.error}
                      </AppText>
                      {chat.canRetry ? <Button label={pl.common.retry} variant="secondary" compact icon="refresh" onPress={chat.retry} /> : null}
                    </View>
                  ) : null}
                  {chat.messages.length > 0 && !chat.pending ? (
                    <>
                      <SuggestionChips items={freshSuggestions.slice(0, 3)} onPick={chat.send} />
                      <Button label={pl.assistant.newChat} variant="ghost" icon="add-circle-outline" compact onPress={chat.newChat} />
                    </>
                  ) : null}
                </View>
              }
            />
            <Disclaimer />
            <Composer pending={chat.pending} onSend={chat.send} onStop={chat.stop} />
          </>
        ) : (
          <ScrollView contentContainerClassName="p-4 pb-8" keyboardShouldPersistTaps="handled">
            <HumanContactForm
              key={`${validChildId ?? 'all'}:${docId ?? ''}`}
              context={chat.context}
              initialQuestion={chat.focusDoc ? `${chat.focusDoc.title}: ` : ''}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

