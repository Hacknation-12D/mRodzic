import '../global.css';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Uniwind, useUniwind } from 'uniwind';

import { useAppBootstrap } from '@/core/bootstrap/useAppBootstrap';
import { getToday } from '@/core/clock/clock';
import { registerLocalDemoProfiles } from '@/core/demo/localDemoProfiles';
import { useProfileStore } from '@/core/profile/profile.store';
import { useSettingsStore } from '@/core/settings/settings.store';
import { pl } from '@/shared/i18n/pl';
import { darkColors, lightColors } from '@/shared/theme';
import type { Profile } from '@/core/types';
import { AppText, appHeaderOptions, PreviewControls } from '@/shared/ui';
import demoProfiles from '@/dev/dummyData/mrodzic_compat_profiles_v1.json';
import { prepareDemoProfile } from '@/dev/personas';

void SplashScreen.preventAutoHideAsync();
// Baza profili DEMO do logowania, gdy nie ustawiono EXPO_PUBLIC_DEMO_API_URL (README_INTEGRACJA.md).
registerLocalDemoProfiles(demoProfiles);

// Uzupełnia dane identyfikacyjne (nazwisko, adres, PESEL) w starszych zapisach persony Anny – potrzebne do wniosku ZAM.
const prepareProfile = (profile: Profile | null) => prepareDemoProfile(profile, undefined, getToday());

/** Root providers, app bootstrap, persisted-store hydration, and global preview controls. */
export default function RootLayout() {
  const ready = useAppBootstrap({ prepareProfile });
  const hasProfile = useProfileStore((s) => s.profile !== null);
  // Bez profilu strona główna jest pusta – logo prowadzi wtedy do logowania.
  const homeHref = hasProfile ? '/' : '/onboarding';
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
        <Stack screenOptions={{ headerBackTitle: pl.common.back, ...appHeaderOptions(c, { homeHref, showProfile: hasProfile }) }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: pl.appName }} />
          <Stack.Screen name="document/[docId]" options={{ title: pl.documents.details }} />
          <Stack.Screen name="profile/index" options={{ title: pl.profile.title, ...appHeaderOptions(c, { homeHref }) }} />
          <Stack.Screen
            name="profile/child/[childId]"
            options={{ title: pl.profile.editChild, ...appHeaderOptions(c, { homeHref, backFallback: '/profile' }) }}
          />
          <Stack.Screen
            name="profile/child/new"
            options={{ title: pl.profile.newChild, ...appHeaderOptions(c, { homeHref, backFallback: '/profile' }) }}
          />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="dev" options={{ title: pl.dev.title }} />
          <Stack.Screen name="+not-found" options={{ title: pl.common.notFoundTitle }} />
        </Stack>
        <PreviewControls hasProfile={hasProfile} isDark={scheme === 'dark'} onToggleTheme={toggleTheme} />
      </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.warningSoft }}>
          <AppText variant="caption" tone="warning" className="px-4 py-1 text-center">
            {pl.demo.simulationBanner}
          </AppText>
        </SafeAreaView>
    </ThemeProvider>
  );
}
