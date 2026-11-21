import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

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
      <Card className="w-full gap-5 self-center p-5 md:max-w-4xl md:p-6">
        <View className="gap-2">
          <AppText variant="title" accessibilityRole="header">
            {t.title}
          </AppText>
          <AppText tone="muted">{t.intro}</AppText>
        </View>

        <Pressable
          onPress={() => void signIn()}
          disabled={phase === 'signing'}
          accessibilityRole="button"
          accessibilityLabel={t.signIn}
          accessibilityHint={t.scanHint}
          accessibilityState={{ disabled: phase === 'signing', busy: phase === 'signing' }}
          className="min-h-24 flex-row items-center gap-4 rounded-box border border-base-300 bg-base-200 p-4 active:opacity-80">
          <View className="size-12 shrink-0 items-center justify-center rounded-field bg-primary-soft">
            <Ionicons name="phone-portrait-outline" size={26} color={c.primary} />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <View className="flex-row flex-wrap items-center gap-2">
              <AppText variant="subheading">{t.appTitle}</AppText>
              <View className="rounded-selector bg-primary-soft px-2 py-1">
                <AppText variant="caption" tone="primary">
                  {t.recommended}
                </AppText>
              </View>
            </View>
            <AppText tone="muted">{t.scanHint}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={c.primary} />
        </Pressable>

        <Button label={t.manual} variant="ghost" onPress={manual} className="min-h-14" />

        {phase === 'error' ? <Alert tone="error">{t.signInError}</Alert> : null}
        <Alert tone="warning" title={t.simulationTitle} icon="flask-outline">
          {t.simulationBody}
        </Alert>
      </Card>

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
