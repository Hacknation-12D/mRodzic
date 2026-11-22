import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { logOut } from '@/core/navigation/session';
import { useProfileStore } from '@/core/profile/profile.store';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { appHeaderOptions } from '@/shared/ui';

type IconName = ComponentProps<typeof Ionicons>['name'];
function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />;
  };
}

/** Home | Assistant | Documents – wspólny nagłówek (Wstecz, logo → strona główna, profil). */
export default function TabsLayout() {
  const c = useThemeColors();
  const profileName = useProfileStore((s) => s.profile?.me.firstName);
  return (
    <Tabs
      screenOptions={{
        ...appHeaderOptions(c, { homeHref: '/', showProfile: true, profileName, onLogout: logOut }),
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.baseContentMuted,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          ...appHeaderOptions(c, { homeHref: '/', showBack: false, showProfile: true, profileName, onLogout: logOut }),
          title: pl.tabs.home,
          headerTitle: '',
          tabBarAccessibilityLabel: pl.tabs.home,
          tabBarIcon: tabIcon('home-outline'),
        }}
      />
      <Tabs.Screen name="assistant" options={{ title: pl.tabs.assistant, tabBarIcon: tabIcon('chatbubbles-outline') }} />
      <Tabs.Screen name="documents" options={{ title: pl.tabs.documents, tabBarIcon: tabIcon('document-text-outline') }} />
    </Tabs>
  );
}
