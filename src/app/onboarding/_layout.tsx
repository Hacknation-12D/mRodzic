import { Stack } from 'expo-router';

import { pl } from '@/shared/i18n/pl';

/** Stack kroków onboardingu. */
export default function OnboardingLayout() {
  return <Stack screenOptions={{ title: pl.appName, headerBackTitle: pl.common.back }} />;
}
