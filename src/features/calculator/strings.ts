import type { BenefitScenarioKind, EligibilityStatus, SicknessInsurance } from '@/core/benefits';

/** Teksty kalkulatora świadczeń. */
export const t = {
  heroTitle: 'Kalkulator świadczeń',
  heroBody: 'Sprawdź, czy przysługuje Ci zasiłek macierzyński, jak długo potrwają urlopy i ile wyniesie świadczenie.',
  heroPrefilled: 'Dane uzupełniliśmy z Twojego profilu (PUE/eZUS) – możesz je zmienić, wynik przeliczy się od razu.',
  disclaimer: 'To szacunek na podstawie podanych danych, a nie decyzja ZUS ani pracodawcy.',

  situation: 'Twoja sytuacja',
  kinds: {
    birth: { label: 'Narodziny', hint: 'Dziecko już jest na świecie' },
    pregnancy: { label: 'Ciąża', hint: 'Liczymy od terminu porodu' },
    adoption: { label: 'Adopcja', hint: 'Przyjęcie w celu przysposobienia' },
    foster: { label: 'Rodzina zastępcza', hint: 'Niezawodowa' },
  } satisfies Record<BenefitScenarioKind, { label: string; hint: string }>,

  inputsTitle: 'Dane do obliczeń',
  eventDate: {
    birth: 'Data porodu',
    pregnancy: 'Przewidywany termin porodu',
    adoption: 'Dzień przyjęcia dziecka',
    foster: 'Dzień przyjęcia dziecka',
  } satisfies Record<BenefitScenarioKind, string>,
  childBirthDate: 'Data urodzenia dziecka',
  schoolDeferral: 'Odroczony obowiązek szkolny',
  schoolDeferralHint: 'Wtedy granica wieku dziecka to 10 lat zamiast 7.',
  childrenCount: (adopting: boolean) => (adopting ? 'Liczba dzieci przyjętych jednocześnie' : 'Liczba dzieci z jednego porodu'),
  employment: 'Forma zatrudnienia',
  sickness: 'Dobrowolne ubezpieczenie chorobowe',
  sicknessOptions: { yes: 'Opłacam', no: 'Nie opłacam', unknown: 'Nie wiem' } satisfies Record<SicknessInsurance, string>,
  grossEmployee: 'Przeciętne wynagrodzenie brutto (12 mies.)',
  grossVoluntary: 'Podstawa składki chorobowej (miesięcznie)',
  grossHint: 'Kwota miesięczna w zł, np. 6500.',
  grossFromProfile: (amount: string) => `Z PUE/eZUS: ${amount}`,
  zaZyciem: 'Zaświadczenie „Za życiem”',
  zaZyciemHint: 'Ciężkie i nieodwracalne upośledzenie albo nieuleczalna choroba dziecka – urlop rodzicielski jest dłuższy.',
  partnerWeeks: 'Tygodnie rodzicielskiego dla drugiego rodzica',
  partnerWeeksHint: '9 tygodni należy wyłącznie do drugiego rodzica – jeśli ich nie wykorzysta, przepadają.',
  resetFromProfile: 'Przywróć dane z profilu',

  status: {
    eligible: 'Na podstawie podanych danych zasiłek macierzyński przysługuje',
    not_eligible: 'Na podstawie podanych danych zasiłek macierzyński nie przysługuje',
    unknown: 'Nie można ustalić – brakuje danych',
  } satisfies Record<EligibilityStatus, string>,
  missingTitle: 'Uzupełnij',
  warningsTitle: 'Zwróć uwagę',
  alternativesTitle: 'Co może Ci przysługiwać zamiast',

  monthly: 'Miesięcznie',
  monthlyHint: (label: string) => `za ${label.toLowerCase()}`,
  total: 'Łącznie',
  totalHint: (weeks: string) => `za ${weeks}`,

  variantsTitle: 'Jak złożyć wniosek?',
  variantsBody: 'Wybór wpływa na wysokość zasiłku. Dotknij wariantu, aby zobaczyć jego wyliczenie.',
  upfrontDeadline: (date: string) => `Wariant 81,5%: wniosek o zasiłek za cały okres trzeba złożyć najpóźniej ${date} (21 dni po porodzie).`,
  upfrontDeadlinePassed: (date: string) =>
    `Termin na wariant 81,5% minął ${date} (21 dni po porodzie). Ten wariant obowiązuje tylko, jeśli wniosek złożono w terminie – w przeciwnym razie 100% za macierzyński i 70% za rodzicielski.`,
  upfront: { title: 'Jeden wniosek w 21 dni', body: '81,5% podstawy przez cały urlop macierzyński i rodzicielski' },
  separate: { title: 'Osobne wnioski', body: '100% za urlop macierzyński, potem 70% za rodzicielski' },
  better: 'Korzystniej',
  difference: (amount: string) => `Różnica: ${amount}`,

  breakdownTitle: 'Wyliczenie',
  rateDaily: (rate: string, daily: string) => `${rate} · ${daily} dziennie`,

  timelineTitle: 'Plan urlopów',
  you: 'Ty',
  partner: 'Drugi rodzic',
  paternity: (weeks: number, deadline: string) => `Urlop ojcowski drugiego rodzica: ${weeks} tyg., do wykorzystania do ${deadline}`,
  unused: (weeks: number) => `${weeks} tyg. urlopu rodzicielskiego przepadnie`,

  whereTitle: 'Gdzie i kiedy złożyć wniosek',
  payer: {
    employer: 'Wniosek składasz u pracodawcy – to on wypłaca zasiłek (zatrudnia ponad 20 ubezpieczonych).',
    zus: 'Wniosek składasz w ZUS – najwygodniej przez PUE/eZUS (wniosek ZAM).',
    unknown: 'Sprawdź w PUE/eZUS lub u pracodawcy, kto wypłaca Twój zasiłek – od tego zależy, gdzie złożysz wniosek.',
  },
  deadline21: 'Wariant 81,5%: wniosek o urlop macierzyński i cały rodzicielski złóż najpóźniej 21 dni po porodzie.',
  documentsHint: 'Do wniosku dołącz akt urodzenia dziecka (albo zaświadczenie o przyjęciu dziecka / postanowienie sądu).',

  howTitle: 'Jak to policzyliśmy',
  howGross: 'Przeciętne miesięczne wynagrodzenie brutto',
  howContributions: 'minus składki społeczne (13,71%)',
  howBase: 'Podstawa wymiaru zasiłku',
  howDaily: 'Stawka dzienna przy 100% (podstawa ÷ 30)',
  howMinimum: 'Zastosowano minimalną podstawę wymiaru.',
  howCap: 'Zastosowano maksymalną podstawę wymiaru.',

  fixInputs: 'Popraw dane, aby zobaczyć wynik',
  weeks: (n: number) => {
    const rounded = Math.round(n * 10) / 10;
    const label = rounded === 1 ? 'tydzień' : [2, 3, 4].includes(rounded % 10) && ![12, 13, 14].includes(rounded % 100) ? 'tygodnie' : 'tygodni';
    return Number.isInteger(rounded) ? `${rounded} ${label}` : `${rounded.toLocaleString('pl-PL')} tyg.`;
  },
};
