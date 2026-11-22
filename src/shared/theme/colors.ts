import { useUniwind } from 'uniwind';

import { darkColors, lightColors, type ThemeColors } from './palette';

export { darkColors, lightColors, type ThemeColors };

export function useThemeColors(): ThemeColors {
  const { theme } = useUniwind();
  return theme === 'dark' ? darkColors : lightColors;
}

export function useIsDark(): boolean {
  return useUniwind().theme === 'dark';
}
