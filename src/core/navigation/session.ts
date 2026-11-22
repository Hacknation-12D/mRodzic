import { router } from 'expo-router';

import { resetAllData } from '../storage/resetAll';

/**
 * Wylogowanie z (symulowanego) konta: usuwa profil, statusy i historię czatu z urządzenia
 * i wraca do logowania. Motyw i ustawienia deweloperskie zostają.
 */
export function logOut() {
  void resetAllData({ keepDevSettings: true });
  router.replace('/onboarding');
}
