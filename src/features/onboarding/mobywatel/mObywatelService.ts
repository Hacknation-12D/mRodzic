import type { Gender } from '@/core/types';

/**
 * SYMULACJA logowania przez mObywatel – bez żadnego połączenia z prawdziwym serwisem.
 * Interfejs jest celowo mały, żeby w przyszłości podmienić implementację na prawdziwą integrację.
 * TODO(verify): prawdziwe „Zaloguj przez mObywatel” wymaga rejestracji aplikacji u operatora
 * (OIDC/OAuth, zakres danych, zgody) – sprawdź aktualne wymagania, zanim cokolwiek podłączysz.
 */
export type MObywatelIdentity = {
  firstName: string;
  lastName: string;
  /** ISO YYYY-MM-DD. */
  birthDate: string;
  gender: Gender;
  city: string;
};

export type MObywatelService = {
  signIn: (signal?: AbortSignal) => Promise<MObywatelIdentity>;
};

/** Przykładowa, wymyślona osoba. */
export const MOCK_IDENTITY: MObywatelIdentity = {
  firstName: 'Anna',
  lastName: 'Łącka',
  birthDate: '1992-04-17',
  gender: 'female',
  city: 'Warszawa',
};

export const SIGN_IN_DELAY_MS = 1400;

export const mockMObywatelService: MObywatelService = {
  signIn: (signal) =>
    new Promise<MObywatelIdentity>((resolve, reject) => {
      const timer = setTimeout(() => resolve({ ...MOCK_IDENTITY }), SIGN_IN_DELAY_MS);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      });
    }),
};
