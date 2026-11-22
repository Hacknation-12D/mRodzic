import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { pl } from '../i18n/pl';
import { useThemeColors, type ThemeColors } from '../theme';

const LOGO = require('../../../assets/images/logo.png');
const HIT = { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' } as const;

type Options = {
  /** Dokąd prowadzi logo (strona główna; bez profilu – początek logowania). */
  homeHref: Href;
  /** Strzałka „Wstecz”. Gdy nie ma historii (np. odświeżona strona w przeglądarce) – przejście do `backFallback`. */
  showBack?: boolean;
  backFallback?: Href;
  /** Ikona profilu po prawej. */
  showProfile?: boolean;
};

/**
 * Wspólny nagłówek wszystkich ekranów (Stack i Tabs): [← Wstecz] [logo → strona główna] · tytuł · [profil].
 * Zwraca opcje ekranu – używaj w `screenOptions` / `options` nawigatorów w src/app.
 */
export function appHeaderOptions(c: ThemeColors, { homeHref, showBack = true, backFallback = homeHref, showProfile = false }: Options) {
  return {
    headerTitleAlign: 'center' as const,
    headerStyle: { backgroundColor: c.base100 },
    headerTintColor: c.primary,
    headerTitleStyle: { color: c.baseContent, fontSize: 17, fontWeight: '600' as const },
    headerShadowVisible: true,
    headerBackVisible: false,
    headerLeft: () => (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: showBack ? 4 : 12 }}>
        {showBack ? <HeaderBack fallback={backFallback} /> : null}
        <HeaderLogo href={homeHref} />
      </View>
    ),
    headerRight: showProfile ? () => <HeaderProfile /> : () => null,
  };
}

function HeaderBack({ fallback }: { fallback: Href }) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      accessibilityRole="button"
      accessibilityLabel={pl.common.back}
      hitSlop={6}
      style={({ pressed }) => [HIT, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="chevron-back" size={26} color={c.primary} />
    </Pressable>
  );
}

function HeaderLogo({ href }: { href: Href }) {
  return (
    <Pressable
      onPress={() => router.navigate(href)}
      accessibilityRole="link"
      accessibilityLabel={pl.header.home}
      hitSlop={6}
      style={({ pressed }) => [{ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1 }]}>
      <Image source={LOGO} contentFit="contain" accessibilityIgnoresInvertColors style={{ width: 96, height: 26 }} />
    </Pressable>
  );
}

function HeaderProfile() {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={pl.tabs.openProfile}
      hitSlop={10}
      style={({ pressed }) => [HIT, { paddingHorizontal: 12, opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="person-circle-outline" size={28} color={c.primary} />
    </Pressable>
  );
}
