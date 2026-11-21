import type { ZamValues } from './zamFields';
import type { localZamParent, ZamChild } from './zamPrefill';

type Option = readonly [value: string, label: string];
type Field = {
  id: string;
  label: string;
  type: 'text' | 'date' | 'check' | 'select';
  maxLength?: number;
  options?: readonly Option[];
};

const field = (page: number, name: string, label: string, type: Field['type'] = 'text', maxLength?: number): Field =>
  ({ id: `Page${page}[0].${name}[0]`, label, type, maxLength });
const select = (page: number, name: string, label: string, options: readonly Option[]): Field =>
  ({ ...field(page, name, label, 'select'), options });
const identityOptions = [['1', 'Dowód osobisty'], ['2', 'Paszport']] as const;

const insured = {
  pesel: field(1, 'III01_NrPESEL', 'PESEL osoby ubezpieczonej', 'text', 11),
  identity: select(1, 'III03_RodzajDokumentu', 'Rodzaj dokumentu tożsamości', identityOptions),
  identityNumber: field(1, 'III04_SeriaNrDok', 'Seria i numer dokumentu', 'text', 9),
  firstName: field(1, 'III06_Imie', 'Imię osoby ubezpieczonej', 'text', 22),
  lastName: field(1, 'III05_Nazwisko', 'Nazwisko osoby ubezpieczonej', 'text', 31),
  birthDate: field(1, 'III07_DataUrodzenia', 'Data urodzenia osoby ubezpieczonej', 'date'),
};

function familyMember(page: number, block: string) {
  return {
    action: select(page, `${block}01A_zgloszenie`, 'Rodzaj zgłoszenia', [['1', 'Zgłoszenie'], ['2', 'Wyrejestrowanie']]),
    effectiveDate: field(page, `${block}02A_DataUrodzenia`, 'Data uzyskania lub utraty uprawnień', 'date'),
    pesel: field(page, `${block}03A_NrPESEL`, 'PESEL członka rodziny', 'text', 11),
    identity: select(page, `${block}05A_RodzajDokumentu`, 'Rodzaj dokumentu tożsamości', identityOptions),
    identityNumber: field(page, `${block}06A_SeriaNrDok`, 'Seria i numer dokumentu', 'text', 9),
    firstName: field(page, `${block}08A_Imie`, 'Imię członka rodziny', 'text', 22),
    lastName: field(page, `${block}07A_Nazwisko`, 'Nazwisko członka rodziny', 'text', 31),
    birthDate: field(page, `${block}09A_DataUrodzenia`, 'Data urodzenia członka rodziny', 'date'),
    relationship: select(page, `${block}10A`, 'Stopień pokrewieństwa', [
      ['01', 'Małżonek'], ['11', 'Dziecko własne, przysposobione lub dziecko małżonka'],
      ['21', 'Wnuk lub inne dziecko objęte opieką'], ['30', 'Matka'], ['31', 'Ojciec'],
      ['32', 'Macocha'], ['33', 'Ojczym'], ['40', 'Babka'], ['41', 'Dziadek'],
      ['50', 'Osoba przysposabiająca'], ['60', 'Inni wstępni'],
    ]),
    sharedHousehold: field(page, `${block}11A`, 'Pozostaje we wspólnym gospodarstwie domowym', 'check'),
    disability: select(page, `${block}12A`, 'Kod niepełnosprawności', [
      ['0', '0 – brak przedłożonego orzeczenia'], ['1', '1 – stopień lekki'],
      ['2', '2 – stopień umiarkowany'], ['3', '3 – stopień znaczny'], ['4', '4 – orzeczenie przed ukończeniem 16 lat'],
    ]),
    postal: field(page, `${block}01B_kodpocztowy`, 'Kod pocztowy', 'text', 6),
    city: field(page, `${block}02B_miejscowosc`, 'Miejscowość', 'text', 26),
    district: field(page, `${block}03B_gmina`, 'Gmina lub dzielnica', 'text', 26),
    street: field(page, `${block}04B_ulica`, 'Ulica', 'text', 30),
    house: field(page, `${block}05B_nrdomu`, 'Numer domu', 'text', 7),
    apartment: field(page, `${block}06B_nrlokalu`, 'Numer lokalu', 'text', 7),
    phone: field(page, `${block}07B_nrtelefonu`, 'Telefon', 'text', 12),
    country: field(page, `${block}08B_syA`, 'Symbol państwa', 'text', 2),
    foreignPostal: field(page, `${block}08B_syB`, 'Zagraniczny kod pocztowy', 'text', 9),
  };
}

const member = familyMember(1, 'IV');
export const zcnaSections = [
  { title: 'Dane płatnika składek', open: true, fields: [
    field(1, 'II01_NrNIP', 'NIP płatnika', 'text', 10),
    field(1, 'II02_NrREGON', 'REGON płatnika', 'text', 14),
    field(1, 'II03_NrPESEL', 'PESEL płatnika', 'text', 11),
    select(1, 'II04_RodzajDokumentu', 'Rodzaj dokumentu płatnika', identityOptions),
    field(1, 'II05_SeriaNrDok', 'Seria i numer dokumentu płatnika', 'text', 9),
    field(1, 'II06_NazwaSkrocona', 'Nazwa skrócona płatnika', 'text', 31),
    field(1, 'II07_Nazwisko', 'Nazwisko płatnika', 'text', 31),
    field(1, 'II08_Imie', 'Imię płatnika', 'text', 22),
    field(1, 'II09_DataUrodzenia', 'Data urodzenia płatnika', 'date'),
  ] },
  { title: 'Dane osoby ubezpieczonej', open: true, fields: Object.values(insured) },
  { title: 'Dane zgłaszanego członka rodziny', open: true, fields: Object.values(member) },
  { title: 'Drugi członek rodziny (opcjonalnie)', open: false, fields: Object.values(familyMember(2, 'V')) },
  { title: 'Oświadczenie płatnika', open: true, fields: [field(2, 'VI01_DataWypelnienia', 'Data wypełnienia', 'date')] },
];

export function zcnaInitialValues(parent: ReturnType<typeof localZamParent>, child?: ZamChild): ZamValues {
  const born = child?.status === 'born';
  return {
    [insured.firstName.id]: parent.first_name,
    [insured.lastName.id]: parent.last_name ?? undefined,
    [insured.pesel.id]: parent.pesel ?? undefined,
    [insured.birthDate.id]: parent.birth_date ?? undefined,
    [member.action.id]: born ? '1' : undefined,
    [member.relationship.id]: born ? '11' : undefined,
    [member.firstName.id]: born ? child.name : undefined,
    [member.lastName.id]: born ? child.last_name ?? parent.last_name ?? undefined : undefined,
    [member.birthDate.id]: born ? child.birth_date ?? undefined : undefined,
  };
}
