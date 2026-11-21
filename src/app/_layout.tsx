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
import { useProfileStore } from '@/core/profile/profile.store';
import { useSettingsStore } from '@/core/settings/settings.store';
import { pl } from '@/shared/i18n/pl';
import { darkColors, lightColors } from '@/shared/theme';
import { PreviewControls } from '@/shared/ui';
import { buildPersona } from '@/dev/personas';

void SplashScreen.preventAutoHideAsync();

const initialProfile = () => (env.seedPersona ? buildPersona(env.seedPersona, getToday()) : null);

/** Root providers, app bootstrap, and global preview controls. */
export default function RootLayout() {
  const ready = useAppBootstrap({ initialProfile });
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const { theme } = useUniwind();
  const scheme = theme === 'dark' ? 'dark' : 'light';
  const themeOverride = useSettingsStore((s) => s.themeOverride);
  const setThemeOverride = useSettingsStore((s) => s.setThemeOverride);
  const c = scheme === 'dark' ? darkColors : lightColors;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const toggleTheme = () => {
    const nextTheme = scheme === 'dark' ? 'light' : 'dark';
    setThemeOverride(nextTheme);
    Uniwind.setTheme(nextTheme);
  };

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (ready) Uniwind.setTheme(themeOverride ?? 'system');
  }, [ready, themeOverride]);

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
        <PreviewControls hasProfile={hasProfile} isDark={scheme === 'dark'} onToggleTheme={toggleTheme} />
      </View>
    </ThemeProvider>
  );
}
