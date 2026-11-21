import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { goToOnboardingStep } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Button, Card, Screen, Sheet } from '@/shared/ui';

import { mockMObywatelService, type MObywatelIdentity } from '../mobywatel/mObywatelService';
import { useOnboardingDraft } from '../onboardingDraft.store';

type Phase = 'idle' | 'signing' | 'confirm' | 'error';

const t = pl.onboarding.login;

/** Krok 0: (symulowane) logowanie przez mObywatel → pobranie danych rodzica → „czy się zgadza?”. */
export function StepLogin() {
  const c = useThemeColors();
  const apply = useOnboardingDraft((s) => s.applyMObywatelIdentity);
  const [phase, setPhase] = useState<Phase>('idle');
  const [identity, setIdentity] = useState<MObywatelIdentity | null>(null);
  const abort = useRef<AbortController | null>(null);

  const signIn = async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhase('signing');
    try {
      const result = await mockMObywatelService.signIn(ctrl.signal);
      if (ctrl.signal.aborted) return;
      setIdentity(result);
      setPhase('confirm');
    } catch {
      if (!ctrl.signal.aborted) setPhase('error');
    }
  };

  const cancel = () => {
    abort.current?.abort();
    setPhase('idle');
  };

  const confirm = () => {
    if (identity) apply(identity);
    setPhase('idle');
    goToOnboardingStep('me');
  };

  const manual = () => {
    setPhase('idle');
    goToOnboardingStep('me');
  };

  const rows: [string, string][] = identity
    ? [
        [t.firstName, identity.firstName],
        [t.lastName, identity.lastName],
        [t.birthDate, isoToPolishDate(identity.birthDate)],
        [t.gender, pl.gender[identity.gender]],
        [t.city, identity.city],
      ]
    : [];

  return (
    <Screen>
      <View className="items-center gap-3 py-4">
        <View className="size-16 items-center justify-center rounded-full bg-primary-soft">
          <Ionicons name="shield-checkmark-outline" size={32} color={c.primary} />
        </View>
        <AppText variant="title" accessibilityRole="header" className="text-center">
          {t.title}
        </AppText>
        <AppText tone="muted" className="text-center">
          {t.intro}
        </AppText>
      </View>

      <Button label={t.signIn} icon="log-in-outline" onPress={() => void signIn()} loading={phase === 'signing'} />
      <Button label={t.manual} variant="ghost" onPress={manual} />

      {phase === 'error' ? <Alert tone="error">{t.signInError}</Alert> : null}
      <Alert tone="warning" title={t.simulationTitle} icon="flask-outline">
        {t.simulationBody}
      </Alert>

      {/* Pasek ładowania i pytanie o zgodność danych – jako „modal” DaisyUI. */}
      <Sheet visible={phase === 'signing'} onClose={cancel} title={t.signingIn} footer={<Button label={pl.common.cancel} variant="ghost" onPress={cancel} />}>
        <View className="items-center py-6" accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Sheet>

      <Sheet visible={phase === 'confirm'} onClose={() => setPhase('idle')} title={t.confirmTitle} footer={<></>}>
        <AppText tone="muted">{t.confirmIntro}</AppText>
        <Card>
          {rows.map(([label, value]) => (
            <View key={label} className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5" accessible accessibilityLabel={`${label}: ${value}`}>
              <AppText variant="small" tone="muted">
                {label}
              </AppText>
              <AppText variant="bodyStrong" className="shrink">
                {value}
              </AppText>
            </View>
          ))}
        </Card>
        <Alert tone="info">{t.storageNote}</Alert>
        <Button label={t.confirmYes} icon="checkmark" onPress={confirm} />
        <Button label={t.confirmNo} variant="ghost" onPress={manual} />
      </Sheet>
    </Screen>
  );
}
