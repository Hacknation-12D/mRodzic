import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { getFamilySupabase, isFamilyPasswordLoginEnabled } from '@/core/supabase/client';
import type { Profile } from '@/core/types';
import { AppText, Button, Card, TextField } from '@/shared/ui';

export function FamilyAccountCard({ profile }: { profile: Profile }) {
  const client = getFamilySupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!client) return;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, [client]);

  if (!client) return null;

  async function run(action: () => PromiseLike<{ error: unknown }>, success: string, failure: string) {
    setBusy(true);
    setMessage('');
    try {
      const { error } = await action();
      if (error) {
        setMessage(failure);
        return false;
      }
      setMessage(success);
      return true;
    } catch {
      setMessage(failure);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const send = async () => {
    const address = email.trim();
    const sent = await run(
      () => client.auth.signInWithOtp({ email: address }),
      'Sprawdź pocztę i wpisz otrzymany kod.',
      'Nie udało się wysłać kodu. Sprawdź adres e-mail i spróbuj ponownie.',
    );
    if (sent) setSentTo(address);
  };
  const verify = async () => {
    const verified = await run(
      () => client.auth.verifyOtp({ email: sentTo, token: code.trim(), type: 'email' }),
      'Zalogowano.',
      'Kod jest nieprawidłowy lub wygasł.',
    );
    if (verified) {
      setSentTo('');
      setCode('');
    }
  };
  const save = () =>
    run(
      () => client.rpc('save_family_profile', {
        parent_data: { ...profile.me, city: profile.me.city ?? profile.household.city },
        children_data: profile.children,
      }),
      'Zapisano dane rodzica i dzieci na koncie.',
      'Nie udało się zapisać profilu. Sprawdź połączenie i konfigurację bazy.',
    );

  return (
    <Card>
      <AppText variant="subheading" accessibilityRole="header">Konto rodzinne</AppText>
      <AppText tone="muted">Po zalogowaniu możesz zapisać dane rodzica i dzieci na swoim koncie.</AppText>
      {session ? (
        <>
          <AppText>{session.user.email}</AppText>
          <Button label="Zapisz profil na koncie" disabled={busy} onPress={() => void save()} />
          {confirmDelete ? (
            <>
              <AppText>Usunąć zapisane na koncie dane rodzica i dzieci?</AppText>
              <Button label="Usuń dane z konta" disabled={busy} onPress={() => {
                setConfirmDelete(false);
                void run(
                  () => client.from('family_parents').delete().eq('user_id', session.user.id),
                  'Usunięto dane z konta.',
                  'Nie udało się usunąć danych z konta.',
                );
              }} />
              <Button label="Anuluj" variant="ghost" disabled={busy} onPress={() => setConfirmDelete(false)} />
            </>
          ) : <Button label="Usuń kopię z konta" variant="ghost" disabled={busy} onPress={() => setConfirmDelete(true)} />}
          <Button label="Wyloguj się" variant="ghost" disabled={busy} onPress={() => {
            setConfirmDelete(false);
            void run(() => client.auth.signOut({ scope: 'local' }), 'Wylogowano.', 'Nie udało się wylogować.');
          }} />
        </>
      ) : sentTo ? (
        <>
          <TextField label="Kod z wiadomości e-mail" value={code} onChangeText={setCode} inputMode="numeric" maxLength={8} editable={!busy} />
          <Button label="Zaloguj się" disabled={busy || !/^\d{6,8}$/.test(code)} onPress={() => void verify()} />
          <Button label="Zmień adres lub wyślij nowy kod" variant="ghost" disabled={busy} onPress={() => {
            setSentTo('');
            setCode('');
            setMessage('');
          }} />
        </>
      ) : (
        <>
          <TextField label="Adres e-mail" value={email} onChangeText={setEmail} inputMode="email" autoCapitalize="none" editable={!busy} />
          <Button label="Wyślij kod logowania" disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())} onPress={() => void send()} />
          {isFamilyPasswordLoginEnabled() ? (
            <>
              <TextField label="Hasło konta testowego" value={password} onChangeText={setPassword} secureTextEntry editable={!busy} />
              <Button label="Zaloguj konto testowe" variant="secondary" disabled={busy || !email.trim() || !password} onPress={() => {
                void run(
                  () => client.auth.signInWithPassword({ email: email.trim(), password }),
                  'Zalogowano na konto testowe.',
                  'Nie udało się zalogować na konto testowe.',
                ).then((success) => { if (success) setPassword(''); });
              }} />
            </>
          ) : null}
        </>
      )}
      {message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}
    </Card>
  );
}
