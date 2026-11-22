import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useRef, useState, type ComponentProps, type ComponentRef } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pl } from '../i18n/pl';
import { useElevation, useThemeColors, type ThemeColors } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';
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
  /** Wylogowanie (pozycja w menu awatara). Brak = pozycja ukryta. */
  onLogout?: () => void;
};

/** Opcje ekranu, z których nagłówek czyta tytuł. `headerTitle: ''` ukrywa tytuł (np. strona główna, onboarding). */
type HeaderProps = { options: { title?: string; headerTitle?: unknown } };

/**
 * Wspólny nagłówek wszystkich ekranów (Stack i Tabs), wyrównany do szerokości treści (PAGE_WIDTH):
 * [‹] [logo → strona główna] | tytuł ··········· [awatar → profil]
 * Zwraca opcje ekranu – używaj w `screenOptions` / `options` nawigatorów w src/app.
 */
export function appHeaderOptions(
  _c: ThemeColors,
  { homeHref, showBack = true, backFallback = homeHref, showProfile = false, profileName, onLogout }: Options,
) {
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
          onLogout={onLogout}
        />
      );
    },
  };
}

type BarProps = { title?: string; homeHref: Href; backFallback?: Href; profileName?: string; onLogout?: () => void };

function AppHeaderBar({ title, homeHref, backFallback, profileName, onLogout }: BarProps) {
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
        {profileName !== undefined ? <AccountMenu name={profileName} onLogout={onLogout} /> : null}
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

type MenuItemProps = { icon: ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean };

function MenuItem({ icon, label, onPress, danger }: MenuItemProps) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="menuitem"
      className="min-h-12 flex-row items-center gap-3 rounded-field px-3 active:bg-base-200">
      <Ionicons name={icon} size={20} color={danger ? c.error : c.baseContentMuted} />
      <AppText variant="bodyStrong" tone={danger ? 'danger' : 'default'}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Awatar z inicjałem → menu konta: Twój profil, wylogowanie (z potwierdzeniem w samym menu).
 * Menu to Modal zakotwiczony pod awatarem – nie przycina go nagłówek, zamyka je dotknięcie poza nim.
 */
function AccountMenu({ name, onLogout }: { name: string; onLogout?: () => void }) {
  const c = useThemeColors();
  const avatarShadow = useElevation(1);
  const menuShadow = useElevation(2);
  const { width } = useWindowDimensions();
  const anchor = useRef<ComponentRef<typeof Pressable>>(null);
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const initial = name.trim().charAt(0).toUpperCase();

  const show = () => {
    anchor.current?.measureInWindow((x, y, w, h) => {
      setPos({ top: y + h + 8, right: Math.max(8, width - (x + w)) });
      setConfirmLogout(false);
      setOpen(true);
    });
  };
  const close = () => setOpen(false);
  const go = (href: Href) => {
    close();
    router.push(href);
  };

  return (
    <>
      <Pressable
        ref={anchor}
        onPress={show}
        accessibilityRole="button"
        accessibilityLabel={pl.accountMenu.open}
        accessibilityState={{ expanded: open }}
        hitSlop={6}
        className="size-10 items-center justify-center rounded-full border-2 border-base-100 bg-primary active:opacity-80"
        style={avatarShadow}>
        {initial ? (
          <AppText variant="bodyStrong" tone="inverse" className="text-base">
            {initial}
          </AppText>
        ) : (
          <Ionicons name="person" size={18} color={c.primaryContent} />
        )}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable className="flex-1" onPress={close} accessibilityLabel={pl.common.close} accessibilityRole="button" />
        <View
          accessibilityRole="menu"
          className="absolute w-64 gap-1 rounded-box border border-base-300 bg-base-100 p-2"
          style={[menuShadow, { top: pos.top, right: pos.right }]}>
          {confirmLogout ? (
            <View className="gap-3 p-2">
              <AppText variant="subheading">{pl.accountMenu.logoutTitle}</AppText>
              <AppText variant="small" tone="muted">
                {pl.accountMenu.logoutBody}
              </AppText>
              <View className="flex-row gap-2">
                <Button compact variant="ghost" label={pl.common.cancel} onPress={() => setConfirmLogout(false)} className="flex-1" />
                <Button
                  compact
                  variant="danger"
                  label={pl.accountMenu.logout}
                  onPress={() => {
                    close();
                    onLogout?.();
                  }}
                  className="flex-1"
                />
              </View>
            </View>
          ) : (
            <>
              {name ? (
                <View className="flex-row items-center gap-3 border-b border-base-300 px-3 pb-3 pt-2">
                  <View className="size-9 items-center justify-center rounded-full bg-primary-soft">
                    <AppText variant="bodyStrong" tone="primary">
                      {initial}
                    </AppText>
                  </View>
                  <AppText variant="subheading" numberOfLines={1} className="flex-1">
                    {name}
                  </AppText>
                </View>
              ) : null}
              <MenuItem icon="person-circle-outline" label={pl.accountMenu.profile} onPress={() => go('/profile')} />
              {onLogout ? (
                <>
                  <View className="mx-2 h-px bg-base-300" />
                  <MenuItem icon="log-out-outline" label={pl.accountMenu.logout} danger onPress={() => setConfirmLogout(true)} />
                </>
              ) : null}
            </>
          )}
        </View>
      </Modal>
    </>
  );
}
