import '../global.css';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useAppBootstrap } from '@/core/bootstrap/useAppBootstrap';
import { getToday } from '@/core/clock/clock';
import { env } from '@/core/config/env';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { darkColors, lightColors } from '@/shared/theme';
import { buildPersona } from '@/dev/personas';

void SplashScreen.preventAutoHideAsync();

const initialProfile = () => (env.seedPersona ? buildPersona(env.seedPersona, getToday()) : null);

/** Providery, hydratacja store'ów, sync treści, przekierowanie do onboardingu (Stack.Protected). */
export default function RootLayout() {
  const ready = useAppBootstrap({ initialProfile });
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const scheme = useColorScheme();
  const c = scheme === 'dark' ? darkColors : lightColors;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.base200, card: c.base100, text: c.baseContent, border: c.base300 } }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackTitle: pl.common.back }}>
        <Stack.Protected guard={hasProfile} redirectTo="/onboarding">
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: pl.appName }} />
          <Stack.Screen name="document/[docId]" options={{ title: pl.documents.details }} />
          <Stack.Screen name="profile/index" options={{ title: pl.profile.title }} />
          <Stack.Screen name="profile/child/[childId]" options={{ title: pl.profile.editChild }} />
          <Stack.Screen name="profile/child/new" options={{ title: pl.profile.newChild }} />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile} redirectTo="/">
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="dev" options={{ title: pl.dev.title }} />
        <Stack.Screen name="+not-found" options={{ title: pl.common.notFoundTitle }} />
      </Stack>
    </ThemeProvider>
  );
}
