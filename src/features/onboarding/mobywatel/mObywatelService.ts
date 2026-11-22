import { addDays, addMonths, format, startOfMonth, subDays } from 'date-fns';

import { calculateMaternityLeave, PARENTAL_LEAVE_WEEKS } from '@/core/benefits';
import { benefitPayerFor } from '@/core/profile/work';
import type { Child, Gender, Work, ZusRecord } from '@/core/types';
import { toISODate } from '@/shared/lib/date';

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

/** Dziecko pobrane z rejestru (tylko urodzone – dzieci „w drodze” nie ma w rejestrze). */
export type MObywatelChild = {
  firstName: string;
  /** ISO YYYY-MM-DD. */
  birthDate: string;
  sex: Child['sex'];
  /** Czy dziecko jest ubezpieczone (z rejestru). */
  insured: boolean;
  /** 11 cyfr. */
  pesel: string;
  birthRegistry: { actNumber: string; office: string };
  vaccinations: { name: string; dueDate: string }[];
};

/** Dane z (symulowanego) PUE/eZUS: praca, zarobki, urlopy oraz konto ubezpieczonego w ZUS – zapisywane w profilu. */
export type PueData = {
  work: Work;
};

/** Wynik logowania: dane rodzica + dzieci (lista może być pusta) + dane z PUE/eZUS. */
export type MObywatelData = {
  identity: MObywatelIdentity;
  children: MObywatelChild[];
  pue?: PueData;
};

export type MObywatelService = {
  signIn: (signal?: AbortSignal) => Promise<MObywatelData>;
};

/** Przykładowa, wymyślona osoba. */
export const MOCK_IDENTITY: MObywatelIdentity = {
  firstName: 'Anna',
  lastName: 'Kowalska',
  birthDate: '1992-04-17',
  gender: 'female',
  city: 'Warszawa',
};

/** Poprawny (z sumą kontrolną) PESEL dla podanej daty urodzenia – tylko do mocka. */
export function mockPesel(birth: Date, serial: number, female: boolean): string {
  const y = birth.getFullYear();
  const monthOffset = y >= 2000 ? 20 : 0;
  const body =
    String(y % 100).padStart(2, '0') +
    String(birth.getMonth() + 1 + monthOffset).padStart(2, '0') +
    String(birth.getDate()).padStart(2, '0') +
    String(serial).padStart(3, '0') +
    String(female ? 2 : 1);
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(body[i]), 0);
  return body + String((10 - (sum % 10)) % 10);
}

function mockChild(firstName: string, birth: Date, sex: 'female' | 'male', serial: number): MObywatelChild {
  const due = (days: number) => toISODate(addDays(birth, days));
  return {
    firstName,
    birthDate: toISODate(birth),
    sex,
    insured: true,
    pesel: mockPesel(birth, serial, sex === 'female'),
    birthRegistry: { actNumber: `${serial}/${birth.getFullYear()}`, office: 'USC Warszawa-Śródmieście' },
    vaccinations: [
      { name: 'Szczepienie 6 w 1 – 1. dawka', dueDate: due(56) },
      { name: 'Pneumokoki – 1. dawka', dueDate: due(56) },
      { name: 'Szczepienie 6 w 1 – 2. dawka', dueDate: due(112) },
    ],
  };
}

/** Przykładowe dzieci: Kasia (2 dni) i Kamil (44 dni) – daty liczone względem „dziś”. */
export function mockChildren(now: Date = new Date()): MObywatelChild[] {
  return [mockChild('Kasia', subDays(now, 2), 'female', 482), mockChild('Kamil', subDays(now, 44), 'male', 317)];
}

/** Poprawny NIP (suma kontrolna) – tylko do mocka. */
export function mockNip(seed: number): string {
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  for (let n = seed; ; n++) {
    const body = String(n).padStart(9, '0').slice(-9);
    const check = weights.reduce((acc, w, i) => acc + w * Number(body[i]), 0) % 11;
    if (check !== 10) return body + String(check);
  }
}

export const MOCK_EMPLOYER = { name: 'Pracownia Graficzna Nowak Sp. z o.o.', nip: mockNip(527104318), regon: '147236985', city: 'Warszawa' };
const MOCK_INSURED_COUNT = 8;
const MOCK_MONTHLY_GROSS = 6800;
/** ≈ 6800 zł brutto po składkach (13,71%), zdrowotnej (9%) i zaliczce PIT (12%, KUP 250, kwota zmniejszająca 300). */
const MOCK_MONTHLY_NET = 4966;

/**
 * Anna: etat u małego pracodawcy (8 ubezpieczonych → zasiłki wypłaca ZUS), obecnie na urlopie
 * macierzyńskim od narodzin starszego dziecka (20 tygodni), urlop rodzicielski i wypoczynkowy w całości do wykorzystania.
 * Zarobki: 12 miesięcy przed miesiącem rozpoczęcia urlopu (podwyżka od stycznia 2026).
 */
export function mockPue(children: MObywatelChild[], now: Date = new Date()): PueData {
  const oldestBirth = children.map((c) => c.birthDate).sort()[0];
  const start = oldestBirth ?? toISODate(now);
  const leave = calculateMaternityLeave({ childrenCount: 1, startDate: start });
  const firstMonth = startOfMonth(new Date(`${start}T00:00:00`));
  const earnings = Array.from({ length: 12 }, (_, i) => {
    const month = addMonths(firstMonth, i - 12);
    return { month: format(month, 'yyyy-MM'), gross: month.getFullYear() >= 2026 ? MOCK_MONTHLY_GROSS : 6400 };
  });
  const zus: ZusRecord = {
    sickness: { insured: true, kind: 'mandatory', since: '2014-10-01', titleCode: '0110 11 0' },
    gaps: [
      { from: '2017-02-01', to: '2017-04-30', reason: 'registered_unemployed' },
      { from: '2019-08-16', to: '2019-08-31', reason: 'between_jobs' },
    ],
    periods: [
      { kind: 'employment_contract', from: '2014-10-01', to: '2017-01-31', fixedTerm: true },
      { kind: 'employment_contract', from: '2017-05-01', to: '2019-08-15', fixedTerm: false },
      { kind: 'employment_contract', from: '2019-09-01', fixedTerm: false },
    ],
    contributionBase: MOCK_MONTHLY_GROSS,
    payer: { ...MOCK_EMPLOYER, paysBenefits: benefitPayerFor(MOCK_INSURED_COUNT) === 'employer' },
    arrears: { amount: 0, checkedAt: toISODate(now) },
    benefitHistory: [
      { from: '2023-02-06', to: '2023-02-17', kind: 'sickness', days: 12 },
      { from: '2024-03-11', to: '2024-03-13', kind: 'care', days: 3 },
    ],
    leaveHistory: [
      { from: '2024-08-05', to: '2024-08-16', kind: 'vacation', days: 10 },
      { from: '2025-07-14', to: '2025-07-25', kind: 'vacation', days: 10 },
      { from: '2025-12-24', to: '2025-12-31', kind: 'vacation', days: 4 },
    ],
  };
  return {
    work: {
      employedSince: '2019-09-01',
      fte: 1,
      employerInsuredCount: MOCK_INSURED_COUNT,
      benefitPayer: benefitPayerFor(MOCK_INSURED_COUNT),
      monthlyGross: MOCK_MONTHLY_GROSS,
      monthlyNet: MOCK_MONTHLY_NET,
      earnings,
      vacation: { entitlementDays: 26, usedDays: 0 },
      maternityLeave: leave.startDate && leave.endDate ? { startDate: leave.startDate, endDate: leave.endDate, weeks: leave.weeks } : undefined,
      parentalLeave: { weeksTotal: PARENTAL_LEAVE_WEEKS.single, weeksUsed: 0 },
      zus,
    },
  };
}

export const SIGN_IN_DELAY_MS = 1400;

export const mockMObywatelService: MObywatelService = {
  signIn: (signal) =>
    new Promise<MObywatelData>((resolve, reject) => {
      const timer = setTimeout(() => {
        const children = mockChildren();
        resolve({ identity: { ...MOCK_IDENTITY }, children, pue: mockPue(children) });
      }, SIGN_IN_DELAY_MS);
      signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new Error('aborted'));
      });
    }),
};
