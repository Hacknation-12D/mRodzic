export type ZamValues = Record<string, string | undefined>;
export type ZamField = { id: string; label: string; type: 'text' | 'date' | 'check'; maxLength?: number };

const field = (page: number, name: string, label: string, type: ZamField['type'] = 'text', maxLength?: number): ZamField =>
  ({ id: `Page${page}[0].${name}[0]`, label, type, maxLength });
const text = (page: number, name: string, label: string, maxLength?: number) => field(page, name, label, 'text', maxLength);
const date = (page: number, name: string, label: string) => field(page, name, label, 'date');
const check = (page: number, name: string, label: string) => field(page, name, label, 'check');

export const applicant = {
  firstName: text(1, 'Imie', 'Imię'),
  lastName: text(1, 'Nazwisko', 'Nazwisko'),
  pesel: text(1, 'PESEL', 'PESEL', 11),
  birthDate: date(1, 'Dataurodzenia', 'Data urodzenia (gdy brak PESEL-u)'),
  identity: text(1, 'Rodzajseriainumerdokumentu', 'Rodzaj, seria i numer dokumentu tożsamości (gdy brak PESEL-u)'),
  street: text(1, 'Ulica', 'Ulica'),
  house: text(1, 'Numerdomu', 'Numer domu'),
  apartment: text(1, 'Numerlokalu', 'Numer lokalu'),
  postal: text(1, 'Kodpocztowy', 'Kod pocztowy'),
  city: text(1, 'Poczta', 'Miejscowość'),
  country: text(1, 'Nazwapaństwa', 'Państwo (przy adresie poza Polską)'),
  phone: text(1, 'Numertelefonu', 'Numer telefonu (opcjonalnie)'),
};

const payer = {
  name: text(1, 'Nazwaplatnika', 'Nazwa albo imię i nazwisko płatnika'),
  nip: text(1, 'NIP', 'NIP płatnika', 10),
  regon: text(1, 'REGON', 'REGON płatnika (gdy brak NIP-u)', 14),
  pesel: text(1, 'PESEL_1', 'PESEL płatnika (gdy brak NIP-u i REGON-u)', 11),
  identity: text(1, 'Rodzajseriainumerdokumentu_1', 'Dokument tożsamości płatnika (gdy brak NIP-u, REGON-u i PESEL-u)'),
  bank: text(2, 'Numerrachunku', 'Numer rachunku bankowego (opcjonalnie)', 26),
};

export const leaves = {
  macierzyński: check(2, 'macierzynskiego', 'Urlop macierzyński'),
  naWarunkach: check(2, 'nawarunkach', 'Urlop na warunkach urlopu macierzyńskiego'),
  rodzicielski: check(2, 'rodzicielskiego', 'Urlop rodzicielski'),
  uzupełniający: check(2, 'uzMacierzynskiego', 'Uzupełniający urlop macierzyński'),
  ojcowski: check(2, 'ojcowskiego', 'Urlop ojcowski'),
};

const leaveDates = {
  maternity: text(2, 'Okres', 'Okres urlopu macierzyńskiego lub na jego warunkach (od–do)'),
  parental: text(2, 'Okres2', 'Okres urlopu rodzicielskiego (od–do)'),
  parentalPart: text(2, 'czesc', 'Która to część urlopu rodzicielskiego?'),
  supplementary: text(2, 'Okres3', 'Okres uzupełniającego urlopu (od–do)'),
  maternityEnd: date(2, 'Data2', 'Data zakończenia poprzedniego okresu zasiłku macierzyńskiego'),
  paternity: text(2, 'Okres4', 'Okres urlopu ojcowskiego (od–do)'),
  paternityPart: text(2, 'Numerlokalu2', 'Która to część urlopu ojcowskiego?'),
};

export const reasons = {
  birth: check(2, 'ZaznaczX1a', 'Urodzenie dziecka'),
  adoption: check(2, 'ZaznaczX1b', 'Przyjęcie dziecka w celu przysposobienia'),
  foster: check(2, 'ZaznaczX1c', 'Przyjęcie dziecka do rodziny zastępczej'),
  expected: check(3, '_2', 'Przewidywana data porodu'),
  postEmployment: check(3, '_3', 'Urodzenie dziecka po ustaniu zatrudnienia'),
  hospital: check(3, '_4', 'Urodzenie dziecka i jego pobyt w szpitalu'),
  mother: check(4, '_5', 'Szczególna sytuacja matki dziecka'),
  discharge: check(5, '_6', 'Wypis ze szpitala'),
};

export const childDetails = {
  basic: text(3, 'Tekst1', 'Dane dziecka (imię, nazwisko, data i miejsce urodzenia)'),
  postEmployment: text(3, 'Tekst13B', 'Dane dziecka po ustaniu zatrudnienia'),
  hospital: text(4, 'Tekst4b', 'Dane dziecka w przypadku pobytu w szpitalu'),
  mother: text(4, 'Tekst4c', 'Dane dziecka w szczególnej sytuacji matki'),
  due: date(3, 'Data2a', 'Przewidywana data porodu'),
  adoption: date(2, 'Data', 'Data przyjęcia dziecka'),
  hospitalPeriod: text(3, 'Tekst4a', 'Okres pobytu dziecka w szpitalu (od–do)'),
};

const employerReasons = [
  check(3, 'upadlosc', 'Upadłość pracodawcy'), check(3, 'likwidacje', 'Likwidacja pracodawcy'),
  check(3, 'rozwiazal', 'Rozwiązanie umowy z naruszeniem prawa stwierdzonym przez sąd'), check(3, 'zmarl', 'Śmierć pracodawcy'),
];
const hospitalReasons = [
  check(3, 'skroceniem', 'Poród przed ukończeniem 28. tygodnia'),
  check(3, 'przerwaniem4A', 'Masa urodzeniowa do 1000 g'),
  check(3, 'przerwaniem4B', 'Poród między 28. a 37. tygodniem i masa powyżej 1000 g'),
  check(3, 'podjeciem', 'Poród po ukończeniu 37. tygodnia i pobyt w szpitalu zgodny z warunkami formularza'),
];
const motherReasons = [
  check(4, 'skroceniem', 'Matka skróciła okres pobierania zasiłku'),
  check(4, 'przerwaniem4A', 'Matka przerwała pobieranie zasiłku z powodu pobytu w szpitalu'),
  check(4, 'przerwaniem4B', 'Matka przerwała pobieranie zasiłku z powodu posiadanego orzeczenia'),
  check(4, 'podjeciem', 'Matka podjęła pracę'),
  check(4, 'porzuceniem', 'Matka porzuciła dziecko'), check(4, 'smiercia', 'Matka zmarła'),
];
const motherData = text(4, 'Tekst13', 'Dane matki (imię, nazwisko i PESEL albo dokument tożsamości i data urodzenia)');
const motherDate = date(4, 'Data5', 'Data wystąpienia okoliczności dotyczącej matki');
const dischargeDate = date(5, 'Data6', 'Data wypisu ze szpitala');
const dischargeWho = [check(5, 'mnie5', 'Wypisano wnioskodawcę'), check(5, 'dziecka5', 'Wypisano dziecko')];

const statements = {
  previousYes: check(5, 'TAK', 'Pobierałem już zasiłek za okres urlopu ojcowskiego z innego tytułu'),
  previousNo: check(5, 'NIE', 'Nie pobierałem zasiłku za okres urlopu ojcowskiego z innego tytułu'),
  previousPeriod: text(5, 'Okres', 'Tytuł i okres pobierania wcześniejszego zasiłku'),
  otherYes: check(5, 'TAK2', 'Drugi rodzic będzie pobierać zasiłek za ten rodzaj urlopu'),
  otherNo: check(5, 'NIE2', 'Drugi rodzic nie będzie pobierać zasiłku za ten rodzaj urlopu'),
  otherPeriod: text(5, 'Okres1', 'Okres pobierania zasiłku przez drugiego rodzica (od–do)'),
  otherFirstName: text(5, 'Imie', 'Imię drugiego rodzica'),
  otherLastName: text(5, 'Nazwisko', 'Nazwisko drugiego rodzica'),
  otherPesel: text(5, 'PESEL', 'PESEL drugiego rodzica', 11),
  otherBirthDate: date(5, 'Dataurodzenia', 'Data urodzenia drugiego rodzica (gdy brak PESEL-u)'),
  otherIdentity: text(5, 'Rodzajseriainumerdokumentu', 'Dokument tożsamości drugiego rodzica (gdy brak PESEL-u)'),
  signedOn: date(5, 'Data', 'Data wypełnienia wniosku'),
};

const insuranceYes = check(2, 'TAK', 'Mam ubezpieczenie chorobowe (jeśli oświadczenie mnie dotyczy)');
const insuranceNo = check(2, 'NIE', 'Nie mam ubezpieczenia chorobowego (jeśli oświadczenie mnie dotyczy)');

export const zamSections = [
  { title: 'Dane wnioskodawcy', fields: Object.values(applicant), open: true },
  { title: 'Płatnik składek i wypłata', fields: Object.values(payer), open: true },
  { title: 'Rodzaj i okres urlopu', open: true, fields: [
    leaves.macierzyński, leaves.naWarunkach, leaveDates.maternity,
    leaves.rodzicielski, leaveDates.parental, leaveDates.parentalPart,
    leaves.uzupełniający, leaveDates.supplementary, leaveDates.maternityEnd,
    leaves.ojcowski, leaveDates.paternity, leaveDates.paternityPart,
    check(2, 'informuje', 'Zamierzam wykorzystać pełny urlop macierzyński i rodzicielski zgodnie z oświadczeniem ZAM'),
    insuranceYes, insuranceNo,
  ] },
  { title: 'Dane dziecka i powód wniosku', open: true, fields: [
    reasons.birth, reasons.adoption, reasons.foster, childDetails.adoption, childDetails.basic,
    check(3, 'ZaznaczX1', 'Dziecko ma zaświadczenie „Za życiem”'), text(3, 'podajimie1', 'Imiona dzieci z zaświadczeniem „Za życiem”'),
    reasons.expected, childDetails.due,
  ] },
  { title: 'Szczególne okoliczności', open: false, fields: [
    reasons.postEmployment, ...employerReasons, childDetails.postEmployment,
    check(3, 'ZaznaczX1d', 'Dziecko urodzone po ustaniu zatrudnienia ma zaświadczenie „Za życiem”'), text(3, 'podajimie', 'Imiona dzieci objętych zaświadczeniem'),
    reasons.hospital, ...hospitalReasons, childDetails.hospitalPeriod, childDetails.hospital,
    reasons.mother, ...motherReasons, motherDate, motherData, childDetails.mother,
    check(4, 'ZaznaczX1d', 'Dziecko w szczególnej sytuacji matki ma zaświadczenie „Za życiem”'), text(4, 'podajimie', 'Imiona dzieci z zaświadczenia'),
    reasons.discharge, ...dischargeWho, dischargeDate,
  ] },
  { title: 'Oświadczenia i data', open: true, fields: Object.values(statements) },
];

const documentLeaves: Record<string, ZamField> = {
  'urlop-macierzynski': leaves.macierzyński,
  'urlop-rodzicielski': leaves.rodzicielski,
  'dodatkowy-urlop-wczesniak': leaves.uzupełniający,
  'urlop-ojcowski': leaves.ojcowski,
};

export const zamLeave = (docId: string) => Object.hasOwn(documentLeaves, docId) ? documentLeaves[docId] : undefined;
