import { Image } from 'expo-image';
import { Stack } from 'expo-router';

import { pl } from '@/shared/i18n/pl';

/** Stack kroków onboardingu. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        title: pl.appName,
        headerBackTitle: pl.common.back,
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
  );
}
