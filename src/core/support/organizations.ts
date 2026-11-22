/**
 * Katalog organizacji non-profit wspierających rodziców w szczególnych sytuacjach (zadanie ZUS, pkt 3 i)
 * oraz oficjalnych źródeł informacji o uprawnieniach rodzicielskich.
 *
 * Każdy wpis ma zweryfikowany adres strony (stan na `verifiedAt`). Telefony podajemy tylko, gdy widnieją na
 * stronie organizacji lub na liście telefonów wsparcia NFZ. Aktualizacja: edycja tej listy (zod pilnuje formatu).
 */
import { z } from 'zod';

export const SupportSituationSchema = z.enum(['loss', 'miscarriage', 'premature', 'serious_illness', 'crisis']);
export type SupportSituation = z.infer<typeof SupportSituationSchema>;

export const SupportOrganizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  /** Forma prawna – w katalogu wyłącznie organizacje pozarządowe (fundacje, stowarzyszenia). */
  kind: z.enum(['foundation', 'association']),
  description: z.string().min(1),
  situations: z.array(SupportSituationSchema).min(1),
  url: z.url(),
  phone: z.string().optional(),
  phoneNote: z.string().optional(),
  /** Zasięg: ogólnopolski albo miasto. */
  area: z.string(),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type SupportOrganization = z.infer<typeof SupportOrganizationSchema>;

export const OfficialSourceSchema = z.object({ id: z.string(), name: z.string(), description: z.string(), url: z.url() });
export type OfficialSource = z.infer<typeof OfficialSourceSchema>;

const VERIFIED = '2026-11-22';

export const SUPPORT_ORGANIZATIONS: SupportOrganization[] = z.array(SupportOrganizationSchema).parse([
  {
    id: 'nagle-sami',
    name: 'Fundacja Nagle Sami',
    kind: 'foundation',
    description: 'Bezpłatny, anonimowy telefon wsparcia dla osób w żałobie i po stracie bliskiej osoby, także dziecka. Prowadzi też ośrodek terapeutyczny.',
    situations: ['loss', 'miscarriage', 'crisis'],
    url: 'https://naglesami.org.pl',
    phone: '800 108 108',
    phoneNote: 'Telefon wsparcia w żałobie – godziny dyżuru sprawdź na stronie fundacji.',
    area: 'ogólnopolska',
    verifiedAt: VERIFIED,
  },
  {
    id: 'rodzic-po-ludzku',
    name: 'Fundacja Rodzić po Ludzku',
    kind: 'foundation',
    description: 'Informacje o prawach rodziców po poronieniu i urodzeniu martwego dziecka (m.in. informator dla szpitali i rodziców), wsparcie w ciąży i porodzie.',
    situations: ['miscarriage', 'loss'],
    url: 'https://rodzicpoludzku.pl',
    area: 'ogólnopolska',
    verifiedAt: VERIFIED,
  },
  {
    id: 'whd',
    name: 'Fundacja Warszawskie Hospicjum dla Dzieci',
    kind: 'foundation',
    description: 'Hospicjum perinatalne i domowe: opieka nad rodziną od diagnozy wady letalnej w ciąży, wsparcie psychologiczne i w żałobie.',
    situations: ['serious_illness', 'loss'],
    url: 'https://www.hospicjum.waw.pl',
    phone: '22 678 16 11',
    area: 'Warszawa i okolice (porady ogólnopolskie)',
    verifiedAt: VERIFIED,
  },
  {
    id: 'gajusz',
    name: 'Fundacja Gajusz',
    kind: 'foundation',
    description: 'Hospicjum perinatalne, stacjonarne i domowe dla dzieci – bezpłatna opieka nad nieuleczalnie chorym dzieckiem i jego rodziną, wsparcie w żałobie.',
    situations: ['serious_illness', 'loss'],
    url: 'https://gajusz.org.pl',
    area: 'Łódź i województwo łódzkie',
    verifiedAt: VERIFIED,
  },
  {
    id: 'wczesniak',
    name: 'Fundacja Wcześniak Rodzice-Rodzicom',
    kind: 'foundation',
    description: 'Porady i materiały dla rodziców wcześniaków – od pobytu na oddziale neonatologicznym po rozwój dziecka w domu.',
    situations: ['premature'],
    url: 'https://wczesniak.pl',
    area: 'ogólnopolska',
    verifiedAt: VERIFIED,
  },
  {
    id: 'koalicja-wczesniak',
    name: 'Fundacja Koalicja dla Wcześniaka',
    kind: 'foundation',
    description: 'Wsparcie i informacje dla rodziców dzieci urodzonych przedwcześnie, sieć organizacji partnerskich w regionach.',
    situations: ['premature'],
    url: 'https://koalicjadlawczesniaka.pl',
    area: 'ogólnopolska',
    verifiedAt: VERIFIED,
  },
  {
    id: 'centrum-wsparcia',
    name: 'Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego (Fundacja ITAKA)',
    kind: 'foundation',
    description: 'Całodobowa, bezpłatna pomoc psychologiczna w kryzysie – telefon, czat i e-mail.',
    situations: ['crisis', 'loss', 'miscarriage'],
    url: 'https://centrumwsparcia.pl',
    phone: '800 70 2222',
    phoneNote: 'Całodobowo, bezpłatnie.',
    area: 'ogólnopolska',
    verifiedAt: VERIFIED,
  },
]);

/** Oficjalne źródła informacji o uprawnieniach (zadanie ZUS: przekierowanie do ZUS, MRPiPS i PIP). */
export const OFFICIAL_SOURCES: OfficialSource[] = z.array(OfficialSourceSchema).parse([
  { id: 'zus', name: 'ZUS – zasiłek macierzyński', description: 'Komu przysługuje, wysokość, wnioski i formularze.', url: 'https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski' },
  { id: 'mrpips', name: 'Ministerstwo Rodziny, Pracy i Polityki Społecznej', description: 'Urlop rodzicielski – zasady, wymiar i łączenie z pracą.', url: 'https://www.gov.pl/web/rodzina/urlop-rodzicielski' },
  { id: 'pip', name: 'Państwowa Inspekcja Pracy', description: 'Porady prawne o rodzicielstwie – ochrona pracownic w ciąży i rodziców.', url: 'https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo' },
  { id: 'usc', name: 'Rejestr stanu cywilnego (gov.pl)', description: 'Odpis aktu urodzenia online – zupełny, skrócony, wielojęzyczny.', url: 'https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego' },
]);

export const SITUATION_LABELS: Record<SupportSituation, string> = {
  loss: 'Śmierć dziecka',
  miscarriage: 'Poronienie, martwe urodzenie',
  premature: 'Wcześniak',
  serious_illness: 'Ciężka choroba dziecka',
  crisis: 'Kryzys psychiczny',
};

/** Organizacje dla wybranych sytuacji (puste = wszystkie), w kolejności katalogu. */
export function organizationsFor(situations: SupportSituation[]): SupportOrganization[] {
  if (situations.length === 0) return SUPPORT_ORGANIZATIONS;
  return SUPPORT_ORGANIZATIONS.filter((o) => o.situations.some((s) => situations.includes(s)));
}

/** Sytuacje wynikające z profilu: strata dziecka, wcześniak, „Za życiem” / niepełnosprawność. */
export function situationsFromProfile(children: { premature?: boolean; disability?: boolean; loss?: { kind: string } }[]): SupportSituation[] {
  const set = new Set<SupportSituation>();
  for (const c of children) {
    if (c.loss) set.add(c.loss.kind === 'stillbirth' ? 'miscarriage' : 'loss');
    if (c.premature) set.add('premature');
    if (c.disability) set.add('serious_illness');
  }
  return [...set];
}
