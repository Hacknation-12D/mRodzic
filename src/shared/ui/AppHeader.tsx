import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pl } from '../i18n/pl';
import { useElevation, useThemeColors, type ThemeColors } from '../theme';
import { AppText } from './AppText';
import { PAGE_WIDTH } from './Screen';

const LOGO = require('../../../assets/images/logo.png');

/** Szerokość, poniżej której nagłówek jest „kompaktowy” (telefon): mniejsze logo. */
const COMPACT_WIDTH = 520;

type Options = {
  /** Dokąd prowadzi logo (strona główna; bez profilu – początek logowania). */
  homeHref: Href;
  /** Przycisk „Wstecz”. Gdy nie ma historii (np. odświeżona strona w przeglądarce) – przejście do `backFallback`. */
  showBack?: boolean;
  backFallback?: Href;
  /** Awatar profilu po prawej. */
  showProfile?: boolean;
  /** Imię właściciela profilu – inicjał w awatarze. */
  profileName?: string;
};

/** Opcje ekranu, z których nagłówek czyta tytuł. `headerTitle: ''` ukrywa tytuł (np. strona główna, onboarding). */
type HeaderProps = { options: { title?: string; headerTitle?: unknown } };

/**
 * Wspólny nagłówek wszystkich ekranów (Stack i Tabs), wyrównany do szerokości treści (PAGE_WIDTH):
 * [‹] [logo → strona główna] | tytuł ··········· [awatar → profil]
 * Zwraca opcje ekranu – używaj w `screenOptions` / `options` nawigatorów w src/app.
 */
export function appHeaderOptions(_c: ThemeColors, { homeHref, showBack = true, backFallback = homeHref, showProfile = false, profileName }: Options) {
  return {
    headerShown: true,
    header: ({ options }: HeaderProps) => {
      const title = typeof options.headerTitle === 'string' ? options.headerTitle : options.title;
      return (
        <AppHeaderBar
          title={title}
          homeHref={homeHref}
          backFallback={showBack ? backFallback : undefined}
          profileName={showProfile ? (profileName ?? '') : undefined}
        />
      );
    },
  };
}

function AppHeaderBar({ title, homeHref, backFallback, profileName }: { title?: string; homeHref: Href; backFallback?: Href; profileName?: string }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_WIDTH;
  return (
    // Odstęp boczny poza ramką szerokości – tak jak w Screen, więc krawędzie zgrywają się z kartami.
    <View className="border-b border-base-300 bg-base-200 px-4" style={{ paddingTop: insets.top }}>
      <View className={`${PAGE_WIDTH} min-h-16 flex-row items-center gap-2 py-2`}>
        {backFallback ? <BackButton fallback={backFallback} /> : null}
        <Pressable
          onPress={() => router.navigate(homeHref)}
          accessibilityRole="link"
          accessibilityLabel={pl.header.home}
          hitSlop={6}
          className="min-h-11 justify-center rounded-field px-1 active:opacity-70">
          <Image source={LOGO} contentFit="contain" accessibilityIgnoresInvertColors style={compact ? { width: 78, height: 21 } : { width: 100, height: 27 }} />
        </Pressable>
        {title ? (
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <View className="h-5 w-px bg-base-300" />
            <AppText variant="subheading" numberOfLines={1} accessibilityRole="header" className="flex-1">
              {title}
            </AppText>
          </View>
        ) : (
          <View className="flex-1" />
        )}
        {profileName !== undefined ? <ProfileAvatar name={profileName} /> : null}
      </View>
    </View>
  );
}

/** Okrągły przycisk z cieniem – ten sam „język” co karty. */
function BackButton({ fallback }: { fallback: Href }) {
  const c = useThemeColors();
  const shadow = useElevation(1);
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback))}
      accessibilityRole="button"
      accessibilityLabel={pl.common.back}
      hitSlop={6}
      className="size-10 items-center justify-center rounded-full border border-base-300 bg-base-100 active:opacity-70"
      style={shadow}>
      <Ionicons name="chevron-back" size={22} color={c.baseContent} />
    </Pressable>
  );
}

/** Awatar z inicjałem (zamiast ogólnej ikony) – prowadzi do profilu rodziny. */
function ProfileAvatar({ name }: { name: string }) {
  const c = useThemeColors();
  const shadow = useElevation(1);
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <Pressable
      onPress={() => router.push('/profile')}
      accessibilityRole="button"
      accessibilityLabel={pl.tabs.openProfile}
      hitSlop={6}
      className="size-10 items-center justify-center rounded-full border-2 border-base-100 bg-primary active:opacity-80"
      style={shadow}>
      {initial ? (
        <AppText variant="bodyStrong" tone="inverse" className="text-base">
          {initial}
        </AppText>
      ) : (
        <Ionicons name="person" size={18} color={c.primaryContent} />
      )}
    </Pressable>
  );
}
