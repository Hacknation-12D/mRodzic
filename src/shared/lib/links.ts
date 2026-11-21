import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/**
 * Otwiera link do wniosku/strony. Najpierw próbuje przeglądarki w aplikacji
 * (expo-web-browser), w razie błędu przekazuje do systemu.
 */
export async function openExternalLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.warn('Nie udało się otworzyć linku', url, e);
    }
  }
}
