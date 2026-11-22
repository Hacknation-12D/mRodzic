import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { pl } from '../i18n/pl';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];
type PageOption = { href: string; label: string; icon: IconName };

const appPages: PageOption[] = [
  { href: '/', label: pl.pageSwitcher.home, icon: 'home-outline' },
  {
    href: '/assistant',
    label: pl.pageSwitcher.assistant,
    icon: 'chatbubbles-outline',
  },
  {
    href: '/documents',
    label: pl.pageSwitcher.documents,
    icon: 'document-text-outline',
  },
  { href: '/calculator', label: pl.pageSwitcher.calculator, icon: 'calculator-outline' },
  { href: '/applications', label: pl.pageSwitcher.applications, icon: 'folder-open-outline' },
];

const onboardingPages: PageOption[] = [
  { href: '/onboarding', label: pl.pageSwitcher.login, icon: 'log-in-outline' },
  {
    href: '/onboarding/partner',
    label: pl.pageSwitcher.partner,
    icon: 'people-outline',
  },
  {
    href: '/onboarding/children',
    label: pl.pageSwitcher.children,
    icon: 'happy-outline',
  },
  {
    href: '/onboarding/household',
    label: pl.pageSwitcher.household,
    icon: 'home-outline',
  },
];

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

type Props = { hasProfile: boolean };

export function PageSwitcher({ hasProfile }: Props) {
  const pathname = usePathname();
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const sections = [
    {
      title: pl.pageSwitcher.app,
      pages: hasProfile
        ? [
            ...appPages,
            {
              href: '/profile',
              label: pl.pageSwitcher.profile,
              icon: 'person-circle-outline' as IconName,
            },
          ]
        : appPages,
    },
    { title: pl.pageSwitcher.onboarding, pages: onboardingPages },
  ];

  return (
    <View style={styles.wrap}>
      {open ? (
        <View style={[styles.menu, { backgroundColor: colors.base100, borderColor: colors.base300 }]}>
          <AppText variant="subheading" className="px-3 pb-2 pt-1">
            {pl.pageSwitcher.title}
          </AppText>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {sections.map((section) => (
              <View key={section.title}>
                <AppText variant="caption" tone="muted" className="px-3 pb-1 pt-2">
                  {section.title}
                </AppText>
                {section.pages.map((page) => {
                  const active = isActive(pathname, page.href);
                  return (
                    <Pressable
                      key={page.href}
                      onPress={() => {
                        setOpen(false);
                        router.navigate(page.href);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: active ? colors.primarySoft : 'transparent',
                          opacity: pressed ? 0.78 : 1,
                        },
                      ]}>
                      <Ionicons name={page.icon} size={18} color={active ? colors.primary : colors.baseContentMuted} />
                      <AppText variant="body" tone={active ? 'primary' : 'default'} className="flex-1">
                        {page.label}
                      </AppText>
                      {active ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Pressable
        onPress={() => setOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={pl.pageSwitcher.label}
        accessibilityHint={pl.pageSwitcher.title}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.trigger,
          {
            backgroundColor: colors.base100,
            borderColor: colors.base300,
            opacity: pressed ? 0.82 : 1,
          },
        ]}>
        <Ionicons name="apps-outline" size={18} color={colors.primary} />
        <AppText variant="small" className="font-semibold">
          {pl.pageSwitcher.label}
        </AppText>
        <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={16} color={colors.baseContentMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    zIndex: 30,
  },
  menu: {
    position: 'absolute',
    right: 0,
    bottom: 58,
    width: 280,
    borderWidth: 1,
    borderRadius: 18,
    padding: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  list: {
    maxHeight: 440,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 24,
  },
});
