import '../global.css';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import { useAppBootstrap } from '@/core/bootstrap/useAppBootstrap';
import { getToday } from '@/core/clock/clock';
import { registerLocalDemoProfiles } from '@/core/demo/localDemoProfiles';
import { logOut } from '@/core/navigation/session';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { lightColors } from '@/shared/theme';
import type { Profile } from '@/core/types';
import { AppText, appHeaderOptions } from '@/shared/ui';
import { offlineProfiles as demoProfiles } from '@/core/demo/DemoDataProvider';
import { prepareDemoProfile } from '@/dev/personas';

void SplashScreen.preventAutoHideAsync();
// Aplikacja ma jeden, jasny motyw – niezależnie od ustawień systemu.
Uniwind.setTheme('light');
// Baza profili DEMO do logowania, gdy nie ustawiono EXPO_PUBLIC_DEMO_API_URL (README_INTEGRACJA.md).
registerLocalDemoProfiles(demoProfiles);

// Uzupełnia dane identyfikacyjne (nazwisko, adres, PESEL) w starszych zapisach persony Anny – potrzebne do wniosku ZAM.
const prepareProfile = (profile: Profile | null) => prepareDemoProfile(profile, undefined, getToday());

/** Root providers, app bootstrap and persisted-store hydration. */
export default function RootLayout() {
  const ready = useAppBootstrap({ prepareProfile });
  const hasProfile = useProfileStore((s) => s.profile !== null);
  const profileName = useProfileStore((s) => s.profile?.me.firstName);
  // Bez profilu strona główna jest pusta – logo prowadzi wtedy do logowania.
  const homeHref = hasProfile ? '/' : '/onboarding';
  const c = lightColors;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider
      value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.primary, background: c.base200, card: c.base100, text: c.baseContent, border: c.base300 } }}>
      <StatusBar style="dark" />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerBackTitle: pl.common.back, ...appHeaderOptions(c, { homeHref, showProfile: hasProfile, profileName, onLogout: logOut }) }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: pl.appName }} />
          <Stack.Screen name="document/[docId]" options={{ title: pl.documents.details }} />
          <Stack.Screen name="calculator" options={{ title: pl.pageSwitcher.calculator }} />
          <Stack.Screen name="applications" options={{ title: pl.pageSwitcher.applications }} />
          <Stack.Screen name="family-plan" options={{ title: pl.pageSwitcher.familyPlan }} />
          <Stack.Screen name="admin" options={{ title: pl.pageSwitcher.admin }} />
          <Stack.Screen name="support" options={{ title: pl.pageSwitcher.support }} />
          <Stack.Screen name="requests" options={{ title: pl.pageSwitcher.requests }} />
          <Stack.Screen name="profile/index" options={{ title: pl.profile.title, ...appHeaderOptions(c, { homeHref, showProfile: hasProfile, profileName, onLogout: logOut }) }} />
          <Stack.Screen
            name="profile/child/[childId]"
            options={{ title: pl.profile.editChild, ...appHeaderOptions(c, { homeHref, backFallback: '/profile', showProfile: hasProfile, profileName, onLogout: logOut }) }}
          />
          <Stack.Screen
            name="profile/child/new"
            options={{ title: pl.profile.newChild, ...appHeaderOptions(c, { homeHref, backFallback: '/profile', showProfile: hasProfile, profileName, onLogout: logOut }) }}
          />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="dev" options={{ title: pl.dev.title }} />
          <Stack.Screen name="+not-found" options={{ title: pl.common.notFoundTitle }} />
        </Stack>
      </View>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.warningSoft }}>
          <AppText variant="caption" tone="warning" className="px-4 py-1 text-center">
            {pl.demo.simulationBanner}
          </AppText>
        </SafeAreaView>
    </ThemeProvider>
  );
}
