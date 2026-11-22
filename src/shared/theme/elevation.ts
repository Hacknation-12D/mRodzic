import type { ViewStyle } from 'react-native';

import { useIsDark } from './colors';

/**
 * Cienie (głębia zamiast płaskich ramek). `boxShadow` działa w RN (Nowa Architektura) i na webie.
 * 1 = karty, 2 = elementy wyróżnione (hero, aktywny wybór), 3 = przyciski główne.
 */
export type ElevationLevel = 0 | 1 | 2 | 3;

const LIGHT: Record<ElevationLevel, string | undefined> = {
  0: undefined,
  1: '0px 1px 2px rgba(31, 27, 22, 0.05), 0px 6px 20px rgba(31, 27, 22, 0.06)',
  2: '0px 2px 6px rgba(31, 27, 22, 0.06), 0px 16px 40px rgba(31, 27, 22, 0.10)',
  3: '0px 6px 16px rgba(0, 120, 52, 0.28)',
};

const DARK: Record<ElevationLevel, string | undefined> = {
  0: undefined,
  1: '0px 1px 2px rgba(0, 0, 0, 0.45), 0px 8px 24px rgba(0, 0, 0, 0.28)',
  2: '0px 2px 8px rgba(0, 0, 0, 0.5), 0px 18px 44px rgba(0, 0, 0, 0.4)',
  3: '0px 6px 18px rgba(0, 120, 52, 0.35)',
};

export function elevationStyle(level: ElevationLevel, dark: boolean): ViewStyle | undefined {
  const shadow = (dark ? DARK : LIGHT)[level];
  return shadow ? { boxShadow: shadow } : undefined;
}

export function useElevation(level: ElevationLevel): ViewStyle | undefined {
  return elevationStyle(level, useIsDark());
}
