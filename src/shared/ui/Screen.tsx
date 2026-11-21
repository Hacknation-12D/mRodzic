import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView, type Edge } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

import { cn } from '../lib/cn';

const SafeAreaView = withUniwind(RNSafeAreaView);

type Props = {
  children: ReactNode;
  /** true = treść w ScrollView; false = sam kontener (np. dla FlatList). */
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  header?: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
  keyboard?: boolean;
};

/** Tło strony = base-200, karty = base-100 (jak w motywach DaisyUI). */
export function Screen({
  children,
  scroll = true,
  padded = true,
  edges = ['bottom'],
  header,
  footer,
  contentClassName,
  keyboard = false,
}: Props) {
  const body = scroll ? (
    <ScrollView
      contentContainerClassName={cn('gap-4 pb-8', padded && 'p-4', contentClassName)}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View className={cn('flex-1', padded && 'p-4', contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-base-200">
      {keyboard ? (
        <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          {header}
          {body}
          {footer}
        </KeyboardAvoidingView>
      ) : (
        <>
          {header}
          {body}
          {footer}
        </>
      )}
    </SafeAreaView>
  );
}
