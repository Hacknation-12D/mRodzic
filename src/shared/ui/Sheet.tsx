import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pl } from '../i18n/pl';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
};

/** DaisyUI: modal modal-bottom + modal-box (na bazie Modal, bez zewnętrznych bibliotek). */
export function Sheet({ visible, onClose, title, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 justify-end" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          className="absolute inset-0 bg-overlay"
          onPress={onClose}
          accessibilityLabel={pl.common.close}
          accessibilityRole="button"
        />
        <View className="max-h-[88%] gap-3 rounded-t-box bg-base-200 px-4 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-base-300" />
          {title ? (
            <AppText variant="heading" accessibilityRole="header">
              {title}
            </AppText>
          ) : null}
          <ScrollView contentContainerClassName="gap-3 pb-3" keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ?? <Button label={pl.common.close} variant="ghost" onPress={onClose} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
