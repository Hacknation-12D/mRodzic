/**
 * Wnioski, których nie ma na zus.pl (zadanie ZUS: „wnioski o urlopy wymagają zaprojektowania”):
 *  - wnioski pracownika do pracodawcy o urlopy związane z rodzicielstwem (Kodeks pracy; zakres danych wg
 *    rozporządzenia MRPiPS z 11.03.2025 r. w sprawie wniosków dotyczących uprawnień pracowników związanych z rodzicielstwem),
 *  - wniosek o odpis aktu urodzenia (USC),
 *  - zaświadczenie o stanie rozliczeń z ZUS (symulacja – ważne przy działalności gospodarczej, art. 2a ustawy zasiłkowej).
 * Czyste funkcje: walidacja, terminy złożenia, treść dokumentu. Wysyłka jest wyłącznie symulowana.
 */
import { addDateDays, daysBetween } from '../applications/engine';
import { debtThreshold, legal } from '../legal/parameters';

export type LeaveRequestKind = 'maternity' | 'maternity_parental' | 'parental' | 'parental_work' | 'paternity' | 'maternity_resignation' | 'maternity_takeover';

export type LeaveRequestDef = {
  kind: LeaveRequestKind;
  title: string;
  /** Minimalna liczba dni przed rozpoczęciem urlopu (null = bez ustawowego wyprzedzenia). */
  noticeDays: number | null;
  deadlineText: string;
  attachments: string[];
  /** Kto może złożyć. */
  who: 'mother' | 'father' | 'any';
  /** Czy pytamy o numer części i wymiar pracy. */
  part?: boolean;
  work?: boolean;
};

export const LEAVE_REQUESTS: Record<LeaveRequestKind, LeaveRequestDef> = {
  maternity: {
    kind: 'maternity',
    title: 'Wniosek o udzielenie urlopu macierzyńskiego',
    noticeDays: null,
    deadlineText: 'Złóż przed rozpoczęciem urlopu. Urlop możesz zacząć najwcześniej 6 tygodni przed przewidywaną datą porodu.',
    attachments: ['Zaświadczenie lekarskie o przewidywanej dacie porodu (gdy urlop zaczyna się przed porodem)', 'Skrócony odpis aktu urodzenia dziecka – po porodzie'],
    who: 'mother',
  },
  maternity_parental: {
    kind: 'maternity_parental',
    title: 'Wniosek o urlop macierzyński i bezpośrednio po nim urlop rodzicielski',
    noticeDays: null,
    deadlineText: 'Jeden wniosek o oba urlopy złóż najpóźniej 21 dni po porodzie – wtedy zasiłek wynosi 81,5% podstawy za cały okres.',
    attachments: ['Skrócony odpis aktu urodzenia dziecka', 'Oświadczenie drugiego rodzica o zamiarze (niekorzystaniu z) urlopu rodzicielskiego'],
    who: 'mother',
  },
  parental: {
    kind: 'parental',
    title: 'Wniosek o udzielenie urlopu rodzicielskiego',
    noticeDays: 21,
    deadlineText: 'Złóż co najmniej 21 dni przed rozpoczęciem urlopu (pracodawca musi go udzielić).',
    attachments: ['Skrócony odpis aktu urodzenia dziecka', 'Oświadczenie drugiego rodzica o okresach jego urlopu rodzicielskiego'],
    who: 'any',
    part: true,
  },
  parental_work: {
    kind: 'parental_work',
    title: 'Wniosek o łączenie urlopu rodzicielskiego z pracą',
    noticeDays: 21,
    deadlineText: 'Złóż co najmniej 21 dni przed rozpoczęciem pracy. Wymiar pracy – najwyżej ½ etatu; urlop wydłuży się proporcjonalnie.',
    attachments: ['Skrócony odpis aktu urodzenia dziecka'],
    who: 'any',
    part: true,
    work: true,
  },
  paternity: {
    kind: 'paternity',
    title: 'Wniosek o udzielenie urlopu ojcowskiego',
    noticeDays: 7,
    deadlineText: 'Złóż co najmniej 7 dni przed rozpoczęciem. Urlop wykorzystasz do ukończenia przez dziecko 12 miesięcy (1 albo 2 części po min. tydzień).',
    attachments: ['Skrócony odpis aktu urodzenia dziecka'],
    who: 'father',
    part: true,
  },
  maternity_resignation: {
    kind: 'maternity_resignation',
    title: 'Wniosek o rezygnację z części urlopu macierzyńskiego',
    noticeDays: 7,
    deadlineText: 'Po wykorzystaniu co najmniej 14 tygodni złóż wniosek najpóźniej 7 dni przed powrotem do pracy. Resztę urlopu przejmuje ojciec.',
    attachments: ['Kopia wniosku ojca o przejęcie urlopu (albo potwierdzenie jego pracodawcy)'],
    who: 'mother',
  },
  maternity_takeover: {
    kind: 'maternity_takeover',
    title: 'Wniosek ojca o udzielenie pozostałej części urlopu macierzyńskiego',
    noticeDays: 7,
    deadlineText: 'Złóż najpóźniej 7 dni przed rozpoczęciem – urlop zaczyna się bezpośrednio po rezygnacji matki.',
    attachments: ['Skrócony odpis aktu urodzenia dziecka', 'Kopia wniosku matki o rezygnację z części urlopu'],
    who: 'father',
  },
};

export type LeaveRequestInput = {
  kind: LeaveRequestKind;
  applicant: { firstName: string; lastName: string; position?: string };
  employer: { name: string; city?: string };
  child: { name: string; birthDate?: string; dueDate?: string };
  start: string;
  end: string;
  part?: number;
  workFraction?: number;
  otherParent?: { name: string; plannedWeeks?: number };
  submittedOn: string;
};

export type RequestCheck = { errors: string[]; warnings: string[]; latestSubmission?: string };

/** Walidacja wniosku urlopowego i sprawdzenie terminu złożenia. */
export function checkLeaveRequest(input: LeaveRequestInput): RequestCheck {
  const def = LEAVE_REQUESTS[input.kind];
  const p = legal();
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.applicant.firstName.trim() || !input.applicant.lastName.trim()) errors.push('Uzupełnij imię i nazwisko.');
  if (!input.employer.name.trim()) errors.push('Uzupełnij nazwę pracodawcy.');
  if (!input.child.name.trim()) errors.push('Uzupełnij imię dziecka.');
  if (!input.start || !input.end) errors.push('Podaj okres urlopu.');
  if (input.start && input.end && input.end < input.start) errors.push('Koniec urlopu jest przed jego początkiem.');
  const birth = input.child.birthDate ?? input.child.dueDate;
  if (!birth) errors.push('Podaj datę urodzenia lub przewidywaną datę porodu dziecka.');
  if (errors.length) return { errors, warnings };

  const days = daysBetween(input.start, input.end) + 1;
  if ((input.kind === 'maternity' || input.kind === 'maternity_parental') && input.start < addDateDays(birth!, -p.maternityBeforeBirthWeeks * 7)) {
    errors.push(`Urlop macierzyński może zacząć się najwcześniej ${p.maternityBeforeBirthWeeks} tygodni przed porodem.`);
  }
  if (input.kind === 'paternity') {
    if (days % 7 !== 0 || days > p.paternityWeeks * 7) errors.push(`Urlop ojcowski: pełne tygodnie, łącznie najwyżej ${p.paternityWeeks}.`);
    if ((input.part ?? 1) > p.paternityMaxParts) errors.push(`Urlop ojcowski można podzielić najwyżej na ${p.paternityMaxParts} części.`);
  }
  if ((input.kind === 'parental' || input.kind === 'parental_work') && (input.part ?? 1) > p.parentalMaxParts) {
    errors.push(`Urlop rodzicielski można podzielić najwyżej na ${p.parentalMaxParts} części.`);
  }
  if (input.kind === 'parental_work' && !(input.workFraction && input.workFraction > 0 && input.workFraction <= p.parentalMaxWorkFraction)) {
    errors.push(`Wymiar pracy musi być większy od 0 i nie większy niż ${p.parentalMaxWorkFraction.toLocaleString('pl-PL')} etatu.`);
  }
  if (input.kind === 'maternity_parental' && input.child.birthDate && daysBetween(input.child.birthDate, input.submittedOn) > p.upfrontApplicationDays) {
    warnings.push(`Minęło więcej niż ${p.upfrontApplicationDays} dni od porodu – wariant 81,5% nie przysługuje; zasiłek: 100% za macierzyński i 70% za rodzicielski.`);
  }

  let latestSubmission: string | undefined;
  if (def.noticeDays !== null) {
    latestSubmission = addDateDays(input.start, -def.noticeDays);
    if (input.submittedOn > latestSubmission) {
      warnings.push(
        `Wniosek składasz później niż ${def.noticeDays} dni przed rozpoczęciem (termin: ${latestSubmission.split('-').reverse().join('.')}). Pracodawca może przesunąć start urlopu – uzgodnij to z nim.`,
      );
    }
  }
  return { errors, warnings, latestSubmission };
}

const pl = (iso?: string) => (iso ? iso.split('-').reverse().join('.') : '—');

/** Treść wniosku urlopowego (sekcje akapitów do PDF). */
export function leaveRequestText(input: LeaveRequestInput): { title: string; sections: string[][] } {
  const def = LEAVE_REQUESTS[input.kind];
  const who = `${input.applicant.firstName} ${input.applicant.lastName}`;
  const childLine = input.child.birthDate
    ? `dziecka ${input.child.name}, urodzonego ${pl(input.child.birthDate)}`
    : `dziecka, którego przewidywana data porodu to ${pl(input.child.dueDate)}`;
  const body: string[] = [
    `${input.employer.city ? `${input.employer.city}, ` : ''}${pl(input.submittedOn)}`,
    `Wnioskodawca: ${who}${input.applicant.position ? `, ${input.applicant.position}` : ''}`,
    `Pracodawca: ${input.employer.name}`,
    def.title.toUpperCase(),
  ];
  switch (input.kind) {
    case 'maternity':
      body.push(`Na podstawie art. 180 Kodeksu pracy wnoszę o udzielenie urlopu macierzyńskiego w związku z urodzeniem ${childLine}, w okresie od ${pl(input.start)} do ${pl(input.end)}.`);
      break;
    case 'maternity_parental':
      body.push(`Na podstawie art. 180 i art. 182¹a Kodeksu pracy wnoszę o udzielenie urlopu macierzyńskiego oraz bezpośrednio po nim urlopu rodzicielskiego w związku z urodzeniem ${childLine}, łącznie w okresie od ${pl(input.start)} do ${pl(input.end)}.`);
      break;
    case 'parental':
      body.push(`Na podstawie art. 182¹a Kodeksu pracy wnoszę o udzielenie urlopu rodzicielskiego (część ${input.part ?? 1}) na ${childLine}, w okresie od ${pl(input.start)} do ${pl(input.end)}.`);
      break;
    case 'parental_work':
      body.push(
        `Na podstawie art. 182¹e Kodeksu pracy wnoszę o umożliwienie łączenia urlopu rodzicielskiego (część ${input.part ?? 1}) z wykonywaniem pracy w wymiarze ${(input.workFraction ?? 0).toLocaleString('pl-PL')} etatu w okresie od ${pl(input.start)} do ${pl(input.end)}. Urlop rodzicielski zostanie udzielony na pozostałą część wymiaru czasu pracy.`,
      );
      break;
    case 'paternity':
      body.push(`Na podstawie art. 182³ Kodeksu pracy wnoszę o udzielenie urlopu ojcowskiego (część ${input.part ?? 1}) w związku z urodzeniem ${childLine}, w okresie od ${pl(input.start)} do ${pl(input.end)}.`);
      break;
    case 'maternity_resignation':
      body.push(`Po wykorzystaniu co najmniej 14 tygodni urlopu macierzyńskiego rezygnuję z jego pozostałej części od ${pl(input.start)} i wracam do pracy. Pozostałą część urlopu (do ${pl(input.end)}) wykorzysta ojciec dziecka – ${input.otherParent?.name || '[imię i nazwisko]'}.`);
      break;
    case 'maternity_takeover':
      body.push(`Na podstawie art. 180 Kodeksu pracy wnoszę o udzielenie pozostałej części urlopu macierzyńskiego w związku z rezygnacją matki dziecka – ${input.otherParent?.name || '[imię i nazwisko]'} – w okresie od ${pl(input.start)} do ${pl(input.end)}.`);
      break;
  }
  if (input.otherParent?.name && (input.kind === 'parental' || input.kind === 'maternity_parental' || input.kind === 'parental_work')) {
    body.push(`Drugi rodzic: ${input.otherParent.name}${input.otherParent.plannedWeeks ? ` – planuje wykorzystać ${input.otherParent.plannedWeeks} tyg. urlopu rodzicielskiego` : ''}.`);
  }
  body.push('Załączniki: ' + def.attachments.join('; ') + '.');
  body.push('Podpis wnioskodawcy: ............................................');
  return { title: def.title, sections: [body, ['Informacja', def.deadlineText, 'Dokument przygotowany w aplikacji mRodzic (DEMO). Sprawdź dane przed złożeniem u pracodawcy.']] };
}

// --- Odpis aktu urodzenia ---

export type CivilCopyKind = 'short' | 'full' | 'multilingual';
export type CivilDelivery = 'online' | 'office' | 'post';

/** Opłata skarbowa za odpis (zł) – do weryfikacji na gov.pl przed złożeniem. */
export const CIVIL_COPY_FEES: Record<CivilCopyKind, number> = { short: 22, full: 33, multilingual: 22 };
export const CIVIL_COPY_LABELS: Record<CivilCopyKind, string> = {
  short: 'Odpis skrócony',
  full: 'Odpis zupełny',
  multilingual: 'Odpis wielojęzyczny (do użycia za granicą)',
};
export const CIVIL_DELIVERY_LABELS: Record<CivilDelivery, string> = {
  online: 'Elektronicznie – na skrzynkę w mObywatelu / e-Doręczenia',
  office: 'Odbiór osobisty w USC',
  post: 'Pocztą na adres zamieszkania',
};

export type CivilCopyInput = {
  kind: CivilCopyKind;
  copies: number;
  delivery: CivilDelivery;
  child: { name: string; lastName?: string; birthDate?: string; actNumber?: string; office?: string };
  applicant: { firstName: string; lastName: string; relation: 'parent' | 'legal_guardian' };
  purpose: string;
  submittedOn: string;
};

export function checkCivilCopy(input: CivilCopyInput): RequestCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.child.name.trim() || !input.child.birthDate) errors.push('Uzupełnij imię i datę urodzenia dziecka.');
  if (!input.applicant.firstName.trim() || !input.applicant.lastName.trim()) errors.push('Uzupełnij dane wnioskodawcy.');
  if (!(input.copies >= 1 && input.copies <= 10)) errors.push('Liczba odpisów: 1–10.');
  if (!input.purpose.trim()) warnings.push('Cel nie jest wymagany, ale ułatwia urzędowi wybór rodzaju odpisu.');
  if (/zus|zasił/i.test(input.purpose)) {
    warnings.push('ZUS i pracodawca zwykle przyjmują skrócony odpis albo sprawdzają dane w rejestrze – odpis zupełny nie jest potrzebny.');
  }
  return { errors, warnings };
}

export function civilCopyFee(input: Pick<CivilCopyInput, 'kind' | 'copies'>): number {
  return CIVIL_COPY_FEES[input.kind] * input.copies;
}

export function civilCopyText(input: CivilCopyInput): { title: string; sections: string[][] } {
  return {
    title: 'Wniosek o wydanie odpisu aktu urodzenia',
    sections: [
      [
        `Data: ${pl(input.submittedOn)}`,
        `Wnioskodawca: ${input.applicant.firstName} ${input.applicant.lastName} (${input.applicant.relation === 'parent' ? 'rodzic' : 'opiekun prawny'})`,
        `Rodzaj: ${CIVIL_COPY_LABELS[input.kind]} · liczba: ${input.copies}`,
        `Dotyczy: ${input.child.name}${input.child.lastName ? ` ${input.child.lastName}` : ''}, urodzone ${pl(input.child.birthDate)}`,
        `Akt urodzenia: ${input.child.actNumber ?? 'numer nieznany'}${input.child.office ? `, ${input.child.office}` : ''}`,
        `Sposób odbioru: ${CIVIL_DELIVERY_LABELS[input.delivery]}`,
        `Cel: ${input.purpose || 'nie podano'}`,
        `Opłata skarbowa: ${civilCopyFee(input)} zł (szacunek – sprawdź aktualną stawkę na gov.pl).`,
      ],
      ['Informacja', 'Wniosek online składasz w usłudze „Odpis aktu stanu cywilnego” na gov.pl (logowanie profilem zaufanym lub mObywatelem). To jest symulacja – nic nie zostało wysłane.'],
    ],
  };
}

// --- Zaświadczenie o stanie rozliczeń (symulacja) ---

export type ContributionStatement = {
  person: string;
  payer: string;
  nip?: string;
  asOf: string;
  arrears: number;
  threshold: number;
  blocksBenefit: boolean;
  text: string;
};

export function contributionStatement(input: { person: string; payer: string; nip?: string; asOf: string; arrears: number; selfEmployed: boolean }): ContributionStatement {
  const threshold = debtThreshold();
  const blocksBenefit = input.selfEmployed && input.arrears > threshold;
  const money = (n: number) => `${n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
  const text = input.arrears <= 0
    ? `Na dzień ${pl(input.asOf)} płatnik nie posiada zaległości z tytułu składek na ubezpieczenia społeczne.`
    : `Na dzień ${pl(input.asOf)} zadłużenie z tytułu składek wynosi ${money(input.arrears)}.${input.selfEmployed ? blocksBenefit ? ` Przekracza próg ${money(threshold)} (1% minimalnego wynagrodzenia) – zasiłek nie zostanie wypłacony do czasu spłaty całości (art. 2a ustawy zasiłkowej); spłata w ciągu 6 miesięcy przywraca prawo.` : ` Nie przekracza progu ${money(threshold)} – nie wstrzymuje wypłaty zasiłku.` : ''}`;
  return { ...input, threshold, blocksBenefit, text };
}

export function contributionStatementText(s: ContributionStatement): { title: string; sections: string[][] } {
  return {
    title: 'Zaświadczenie o stanie rozliczeń z ZUS (symulacja)',
    sections: [[`Ubezpieczony: ${s.person}`, `Płatnik składek: ${s.payer}${s.nip ? ` (NIP ${s.nip})` : ''}`, `Stan na dzień: ${pl(s.asOf)}`, s.text, 'Dokument symulowany – w PUE/eZUS zaświadczenie o niezaleganiu wydaje się na wniosek US-7.']],
  };
}
