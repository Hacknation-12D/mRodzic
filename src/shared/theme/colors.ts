import { useColorScheme } from 'react-native';

import { darkColors, lightColors, type ThemeColors } from './palette';

export { darkColors, lightColors, type ThemeColors };

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
