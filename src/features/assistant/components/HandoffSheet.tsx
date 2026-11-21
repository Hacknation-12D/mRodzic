import { useState } from 'react';
import { View } from 'react-native';

import { Alert, AppText, Button, Sheet, TextField } from '@/shared/ui';

import { isValidEmail } from '../contact.store';
import { t } from '../strings';

type Props = {
  visible: boolean;
  /** E-mail zapisany wcześniej – wstępnie wypełnia pole. */
  initialEmail: string | null;
  onClose: () => void;
  onConfirm: (email: string) => Promise<void>;
};

/** Pop-up przekazania rozmowy człowiekowi: prosi o e-mail (prefilled, jeśli znany). */
export function HandoffSheet({ visible, initialEmail, onClose, onConfirm }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '');
  const [showError, setShowError] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const valid = isValidEmail(email);

  const confirm = async () => {
    if (!valid) return setShowError(true);
    setSending(true);
    setFailed(false);
    try {
      await onConfirm(email.trim());
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t.handoff.title}
      footer={
        <View className="gap-2">
          <Button label={t.handoff.confirm} icon="send-outline" onPress={() => void confirm()} loading={sending} />
          <Button label={t.handoff.cancel} variant="ghost" onPress={onClose} />
        </View>
      }>
      <AppText tone="muted">{t.handoff.intro}</AppText>
      <TextField
        label={t.handoff.emailLabel}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="done"
        onSubmitEditing={() => void confirm()}
        error={showError && !valid ? t.handoff.emailError : undefined}
      />
      <Alert tone="info" icon="mail-outline">
        {t.handoff.emailInfo}
      </Alert>
      {failed ? (
        <AppText tone="danger" variant="small">
          {t.handoff.sendError}
        </AppText>
      ) : null}
      <AppText variant="small" tone="muted">
        {t.handoff.consent}
      </AppText>
    </Sheet>
  );
}
