import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';

import { goToProfile } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
function tabIcon(name: IconName) {
  return function TabIcon({ color, size }: { color: unknown; size: number }) {
    return <Ionicons name={name} color={String(color)} size={size} />;
  };
}

/** Home | Assistant | Documents; profile icon in the header. */
export default function TabsLayout() {
  const c = useThemeColors();
  const profileButton = () => (
    <Pressable onPress={goToProfile} accessibilityRole="button" accessibilityLabel={pl.tabs.openProfile} hitSlop={10} style={{ paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' }}>
      <Ionicons name="person-circle-outline" size={28} color={c.primary} />
    </Pressable>
  );
  return (
    <Tabs
      screenOptions={{
        headerRight: profileButton,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.baseContentMuted,
        tabBarStyle: { display: 'none' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: pl.tabs.home,
          tabBarAccessibilityLabel: pl.tabs.home,
          tabBarIcon: tabIcon('home-outline'),
          headerTitle: () => (
            <Image
              source={require('../../../assets/images/logo.png')}
              contentFit="contain"
              accessibilityLabel={pl.appName}
              style={{ width: 124, height: 32 }}
            />
          ),
        }}
      />
      <Tabs.Screen name="assistant" options={{ title: pl.tabs.assistant, tabBarIcon: tabIcon('chatbubbles-outline') }} />
      <Tabs.Screen name="documents" options={{ title: pl.tabs.documents, tabBarIcon: tabIcon('document-text-outline') }} />
    </Tabs>
  );
}
