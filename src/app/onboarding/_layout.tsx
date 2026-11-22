import { Stack } from 'expo-router';

import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { appHeaderOptions } from '@/shared/ui';

/** Stack kroków onboardingu – ten sam nagłówek co w reszcie aplikacji (tytuł kroku jest w treści). */
export default function OnboardingLayout() {
  const c = useThemeColors();
  const homeHref = useProfileStore((s) => (s.profile ? '/' : '/onboarding'));
  return (
    <Stack screenOptions={{ title: pl.appName, ...appHeaderOptions(c, { homeHref, backFallback: '/onboarding' }), headerTitle: '' }}>
      <Stack.Screen name="index" options={{ ...appHeaderOptions(c, { homeHref, showBack: false }), headerTitle: '' }} />
    </Stack>
  );
}
