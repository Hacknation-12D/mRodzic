import { useState } from 'react';
import { View } from 'react-native';

import { humanSupport, isValidContact, QUESTION_MAX, useSupportTicketsStore, type AssistantContext } from '@/core/assistant';
import { pl } from '@/shared/i18n/pl';
import { formatTime } from '@/shared/lib/date';
import { Alert, AppText, Badge, Button, Card, TextField, ToggleRow } from '@/shared/ui';

type Props = { context: AssistantContext | null; initialQuestion?: string };

export function HumanContactForm({ context, initialQuestion = '' }: Props) {
  const tickets = useSupportTicketsStore((s) => s.tickets);
  const [question, setQuestion] = useState(initialQuestion);
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ticketId: string; queued: boolean } | null>(null);

  const errors = {
    question: !question.trim() || question.length > QUESTION_MAX ? pl.assistant.human.errorQuestion : undefined,
    contact: !isValidContact(contact) ? pl.assistant.human.errorContact : undefined,
    consent: !consent ? pl.assistant.human.errorConsent : undefined,
  };
  const valid = !errors.question && !errors.contact && !errors.consent;

  const submit = async () => {
    if (!valid || !context) return setShowErrors(true);
    setSending(true);
    try {
      setResult(await humanSupport.submit({ question, contact, context }));
      setQuestion('');
      setShowErrors(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="gap-4">
      <AppText tone="muted">{pl.assistant.human.intro}</AppText>
      {result ? (
        <Alert tone="success" title={result.queued ? pl.assistant.human.queued : pl.assistant.human.sent(result.ticketId)}>
          {result.queued ? <AppText variant="small" tone="muted">{result.ticketId}</AppText> : null}
        </Alert>
      ) : null}
      <TextField
        label={pl.assistant.human.question}
        value={question}
        onChangeText={setQuestion}
        multiline
        maxLength={QUESTION_MAX}
        error={showErrors ? errors.question : undefined}
      />
      <TextField
        label={pl.assistant.human.contact}
        value={contact}
        onChangeText={setContact}
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        error={showErrors ? errors.contact : undefined}
      />
      <ToggleRow label={pl.assistant.human.consent} value={consent} onChange={setConsent} hint={showErrors ? errors.consent : undefined} />
      <Button label={pl.assistant.human.submit} icon="send-outline" onPress={() => void submit()} loading={sending} />

      {tickets.length > 0 ? (
        <View className="mt-3 gap-3">
          <AppText variant="subheading" accessibilityRole="header">
            {pl.assistant.human.history}
          </AppText>
          {tickets.map((t) => (
            <Card key={t.id}>
              <View className="flex-row items-center justify-between">
                <AppText variant="bodyStrong">{t.id}</AppText>
                <Badge
                  label={t.status === 'sent' ? pl.assistant.human.statusSent : pl.assistant.human.statusQueued}
                  tone={t.status === 'sent' ? 'success' : 'warning'}
                />
              </View>
              <AppText numberOfLines={3}>{t.question}</AppText>
              <AppText variant="small" tone="muted">
                {formatTime(t.createdAt)}
              </AppText>
            </Card>
          ))}
        </View>
      ) : null}
    </View>
  );
}

