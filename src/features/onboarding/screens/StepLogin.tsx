import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { listDemoProfiles, loginDemoProfile } from '@/core/demo/demoApi';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate } from '@/shared/lib/date';
import { useThemeColors } from '@/shared/theme';
import { Alert, AppText, Button, Card, Screen, Select, Sheet } from '@/shared/ui';

type Catalog = Awaited<ReturnType<typeof listDemoProfiles>>;
type LoginResult = Awaited<ReturnType<typeof loginDemoProfile>>;
type Phase = 'idle' | 'signing' | 'confirm' | 'error';
type Row = [label: string, value: string];

const t = pl.onboarding.login;
const RANDOM = 'random';

/**
 * Krok 0: (symulowane) logowanie przez mObywatel → profil z bazy (API SQLite albo wbudowany eksport JSON,
 * patrz README_INTEGRACJA.md) → „czy się zgadza?” → zapis całego profilu i przejście do aplikacji.
 */
export function StepLogin() {
  const c = useThemeColors();
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<LoginResult | null>(null);
  const [profiles, setProfiles] = useState<Catalog | null>(null);
  const [selected, setSelected] = useState(RANDOM);
  const pendingList = useRef<AbortController | null>(null);
  const pendingLogin = useRef<AbortController | null>(null);

  // Przy każdym wejściu na ekran: świeża lista i znów „losowy profil”.
  useFocusEffect(
    useCallback(() => {
      const ctrl = new AbortController();
      pendingList.current = ctrl;
      setSelected(RANDOM);
      setPhase('idle');
      listDemoProfiles(ctrl.signal)
        .then((list) => !ctrl.signal.aborted && setProfiles(list))
        .catch(() => !ctrl.signal.aborted && setProfiles([]));
      return () => {
        pendingList.current?.abort();
        pendingLogin.current?.abort();
      };
    }, []),
  );

  const signIn = async () => {
    pendingLogin.current?.abort();
    const ctrl = new AbortController();
    pendingLogin.current = ctrl;
    setPhase('signing');
    try {
      const res = await loginDemoProfile(selected === RANDOM ? undefined : selected, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResult(res);
      setPhase('confirm');
    } catch {
      if (!ctrl.signal.aborted) setPhase('error');
    }
  };

  const cancel = () => {
    pendingLogin.current?.abort();
    setPhase('idle');
  };

  const confirm = () => {
    if (!result) return;
    useProfileStore.getState().setDemoProfile(result.profileId, result.appProfileV1);
    setPhase('idle');
    router.replace('/');
  };

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

        {profiles && profiles.length > 0 ? (
          <Select
            label={pl.demo.profile}
            hint={pl.demo.profileHint}
            value={selected}
            options={[
              { value: RANDOM, label: pl.demo.random },
              ...profiles.map((p) => ({ value: p.profileId, label: p.label })),
            ]}
            onChange={(v) => setSelected(v ?? RANDOM)}
          />
        ) : null}

        {phase === 'error' ? <Alert tone="error">{t.signInError}</Alert> : null}
      </Card>

      {/* Pasek ładowania i pytanie o zgodność danych – jako „modal” DaisyUI. */}
      <Sheet
        visible={phase === 'signing'}
        onClose={cancel}
        title={t.signingIn}
        footer={<Button label={pl.common.cancel} variant="ghost" onPress={cancel} />}>
        <View className="items-center py-6" accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </Sheet>

      <Sheet visible={phase === 'confirm'} onClose={() => setPhase('idle')} title={t.confirmTitle} footer={<></>}>
        <AppText tone="muted">{t.confirmIntro}</AppText>
        {result ? <RowsCard rows={identityRows(result)} /> : null}
        <Alert tone="info">{pl.demo.storageNote}</Alert>
        {hasProfile ? <Alert tone="warning">{pl.demo.replaceProfile}</Alert> : null}
        <Button label={t.confirmYes} icon="checkmark" onPress={confirm} />
        <Button label={t.confirmNo} variant="ghost" onPress={() => setPhase('idle')} />
      </Sheet>
    </Screen>
  );
}

function identityRows({ mobywatel }: LoginResult): Row[] {
  return [
    [t.firstName, mobywatel.firstName],
    [t.lastName, mobywatel.lastName],
    [t.city, mobywatel.city],
    [t.birthDate, isoToPolishDate(mobywatel.birthDate)],
  ];
}

function RowsCard({ rows }: { rows: Row[] }) {
  return (
    <Card>
      {rows.map(([label, value]) => (
        <View
          key={label}
          className="flex-row items-baseline justify-between gap-3 border-b border-base-300 py-1.5"
          accessible
          accessibilityLabel={`${label}: ${value}`}>
          <AppText variant="small" tone="muted">
            {label}
          </AppText>
          <AppText variant="bodyStrong" className="shrink text-right">
            {value}
          </AppText>
        </View>
      ))}
    </Card>
  );
}
