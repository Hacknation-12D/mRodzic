import '../global.css';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Uniwind, useUniwind } from 'uniwind';

import { useAppBootstrap } from '@/core/bootstrap/useAppBootstrap';
import { getToday } from '@/core/clock/clock';
import { env } from '@/core/config/env';
import { useSettingsStore } from '@/core/settings/settings.store';
import { pl } from '@/shared/i18n/pl';
import { darkColors, lightColors } from '@/shared/theme';
import { ThemeSwitch } from '@/shared/ui';
import { buildPersona } from '@/dev/personas';

void SplashScreen.preventAutoHideAsync();

const initialProfile = () => (env.seedPersona ? buildPersona(env.seedPersona, getToday()) : null);

/** Root providers, persisted-store hydration, and content sync. */
export default function RootLayout() {
  const ready = useAppBootstrap({ initialProfile });
  const { theme } = useUniwind();
  const scheme = theme === 'dark' ? 'dark' : 'light';
  const c = scheme === 'dark' ? darkColors : lightColors;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const toggleTheme = () => {
    const nextTheme = scheme === 'dark' ? 'light' : 'dark';
    useSettingsStore.getState().setThemeOverride(nextTheme);
    Uniwind.setTheme(nextTheme);
  };

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (ready) Uniwind.setTheme(useSettingsStore.getState().themeOverride ?? 'system');
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider
      value={{ ...base, colors: { ...base.colors, primary: c.primary, background: c.base200, card: c.base100, text: c.baseContent, border: c.base300 } }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerBackTitle: pl.common.back }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: pl.appName }} />
          <Stack.Screen name="document/[docId]" options={{ title: pl.documents.details }} />
          <Stack.Screen name="profile/index" options={{ title: pl.profile.title }} />
          <Stack.Screen name="profile/child/[childId]" options={{ title: pl.profile.editChild }} />
          <Stack.Screen name="profile/child/new" options={{ title: pl.profile.newChild }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="dev" options={{ title: pl.dev.title }} />
          <Stack.Screen name="+not-found" options={{ title: pl.common.notFoundTitle }} />
        </Stack>
        <ThemeSwitch isDark={scheme === 'dark'} onToggle={toggleTheme} />
      </View>
    </ThemeProvider>
  );
}
