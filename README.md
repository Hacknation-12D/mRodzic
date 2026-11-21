# Rodzic – świadczenia i formalności dla rodziców (Expo + Supabase + OpenAI)

Aplikacja mobilna pomagająca przyszłym i świeżo upieczonym rodzicom w Polsce ogarnąć świadczenia, urlopy i formalności związane z ciążą i dziećmi. Obsługuje wiele dzieci (także dziecko w drodze i bliźnięta).

- **Kalendarz** – siatka miesiąca z kropkami terminów w kolorach dzieci, „W tym miesiącu warto”, 3 poradniki dopasowane do etapu.
- **Asystent** – czat (mock offline albo OpenAI przez Supabase Edge Function) ze źródłami + formularz „Zapytaj człowieka”.
- **Dokumenty** – zakładki „Przysługuje” i „Nie przysługuje” z wstępną oceną według reguł aplikacji. Sekcja „Uzupełnij dane” pokazuje sprawy z nieustalonym wynikiem. W szczegółach można otworzyć materiały ZUS oraz wypełnić i pobrać formularz ZAM w wersji webowej.
- **Profil / onboarding** – logowanie przez mObywatel (symulacja: pobiera imię, płeć i miejscowość rodzica i pyta „Czy te dane się zgadzają?”), rodzic, partner (opcjonalnie), dzieci (kreator „Dziecko 1 z N”, „Dodaj bliźniaka”), gospodarstwo; akcja „Urodziło się!”.

Działa **bez internetu i bez konfiguracji** (wbudowany seed treści + asystent mock). Profil zapisuje się na urządzeniu. Po skonfigurowaniu Supabase użytkownik może dodatkowo zapisać dane rodziny na swoim koncie.

---

## Szybki start (bez Supabase)

```bash
npm i
npx expo start
```

Zeskanuj kod QR w **Expo Go** (iOS/Android) albo naciśnij `w`, żeby otworzyć wersję web. Plik `.env` nie jest potrzebny.

Wymagania: Node 20+ (testowane na Node 24), Expo SDK 58.

## Skrypty npm

| Skrypt | Co robi |
|---|---|
| `npm start` | `expo start` |
| `npm run typecheck` | `tsc --noEmit` (TypeScript strict) |
| `npm run lint` | ESLint (flat config) z regułami granic architektury |
| `npm test` | Vitest – czyste funkcje w `src/core`, walidacja seeda, format CSV |
| `npm run content:validate` | walidacja `content/seed/*.json` schematami zod |
| `npm run content:seed-sql` | generuje `supabase/seed.sql` z danych JSON |
| `npm run content:import -- --from <dir> --format csv\|json [--dry-run]` | CSV/JSON → walidacja → upsert do Supabase |
| `npm run content:export` | Supabase → `content/seed/*.json` |
| `npm run check` | typecheck + lint + test + content:validate |

## Zmienne środowiskowe

Skopiuj `.env.example` do `.env` (plik jest w `.gitignore`).

| Zmienna | Gdzie | Opis |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | aplikacja | URL projektu Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | aplikacja | klucz **anon** (publiczny; RLS ogranicza dostęp) |
| `EXPO_PUBLIC_ASSISTANT_MODE` | aplikacja | `mock` (domyślnie) albo `remote` |
| `EXPO_PUBLIC_SEED_PERSONA` | aplikacja | `ania` / `magda` / `kasia` – wczytuje personę przy pierwszym starcie (pomija onboarding) |
| `SUPABASE_URL` | skrypty | URL projektu (dla `content:import/export`) |
| `SUPABASE_SERVICE_ROLE_KEY` | skrypty | klucz **service role** – tylko lokalnie/CI, **nigdy w aplikacji** |

Brak dowolnej zmiennej nie powoduje błędu: bez Supabase → seed + mock, `remote` bez Supabase → mock.

## Konfiguracja Supabase krok po kroku

1. Załóż projekt na [supabase.com](https://supabase.com), skopiuj URL, klucz anon i service role do `.env`.
2. Zainstaluj CLI i połącz projekt:
   ```bash
   npx supabase init          # tworzy supabase/config.toml (istniejące migracje zostają)
   npx supabase login
   npx supabase link --project-ref <ref>
   ```
3. Utwórz tabele, RLS i trigger wersji treści:
   ```bash
   npx supabase db push
   ```
4. Wgraj treść (seed JSON albo arkusz CSV):
   ```bash
   npm run content:import -- --from content/seed --format json
   ```
5. Wdróż asystenta i ustaw sekrety (model ustawiasz sam – w kodzie nie ma wpisanego na sztywno modelu; sprawdź aktualną listę modeli w dokumentacji OpenAI):
   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=<aktualny-model> OPENAI_WEB_SEARCH=false
   npx supabase functions deploy assistant
   ```
   `TODO(verify)`: jeśli projekt używa nowych kluczy „publishable” (nie-JWT), wdrażaj z `--no-verify-jwt`.
6. W `.env` ustaw `EXPO_PUBLIC_ASSISTANT_MODE=remote` i zrestartuj `npx expo start`.

### Co jest w bazie (`supabase/migrations/0001_init.sql`)

- `content_documents`, `content_tips`, `content_todos`, `content_prompts` – kolumny jak w schematach zod (snake_case), pola złożone jako `jsonb` (w środku camelCase), `published`, `updated_at`.
- `content_meta (id=1, version, updated_at)` – trigger na INSERT/UPDATE/DELETE w `content_*` podbija `version`. Aplikacja porównuje wersję i pobiera treść tylko, gdy jest nowsza.
- `support_requests` – zgłoszenia „Zapytaj człowieka” (limity długości w `check`).
- **RLS**: `anon` czyta tylko opublikowane treści i `content_meta`, do `support_requests` może tylko wstawiać (bez odczytu). Zapis treści tylko `service_role`.

### Dane przykładowe w SQL Editorze

W nowym projekcie Supabase uruchom w **SQL Editorze** migracje z katalogu `supabase/migrations` w kolejności numerów, a następnie `supabase/seed.sql`. Seed zasila katalog dokumentów, poradniki, zadania i podpowiedzi. Dotychczasowe rekordy o tym samym ID zachowują swoje wartości. W już zasilonej bazie do publikacji zmian w katalogu służy `npm run content:import -- --from content/seed --format json`.

### Konto rodzinne w Supabase

Migracja `0002_family_profiles.sql` tworzy prywatne tabele `family_parents` i `family_children`. RLS wiąże rekordy z identyfikatorem konta Supabase Auth. Zapisywanie rodzica i aktualnej listy dzieci odbywa się w jednej transakcji.

Migracja `0003_child_last_name.sql` dodaje `family_children.last_name`, uzupełnia ją w dotychczasowych rekordach i synchronizuje nazwisko dziecka z nazwiskiem rodzica. Edytor ZAM wczytuje imię i nazwisko dziecka.

W Supabase Auth włącz logowanie przez e-mail i w szablonie „Magic Link” umieść kod `{{ .Token }}`. Po skonfigurowaniu `EXPO_PUBLIC_SUPABASE_URL` i `EXPO_PUBLIC_SUPABASE_ANON_KEY` aplikacja pokaże sekcję **Konto rodzinne** w profilu. Zaloguj się kodem i wybierz **Zapisz profil na koncie**. Ponowne zapisanie aktualizuje profil i listę dzieci. W tej samej sekcji można usunąć kopię z konta.

Do testowania profilu rodziny użyj person z DevPanelu, niezależnie od danych katalogowych w Supabase. Na przykład wyczyść dochód na osobę w profilu rodziny z noworodkiem i otwórz „Becikowe”. Zapisanie brakującej kwoty przeliczy wynik w szczegółach i na liście.

### Formularze i instrukcje ZUS

Katalog `public/pdfs` zawiera oryginalne pliki ZUS. ZAM obsługuje zasiłek za okres urlopu macierzyńskiego, rodzicielskiego, ojcowskiego i uzupełniającego urlopu macierzyńskiego. ZCNA dotyczy zgłoszenia członka rodziny do ubezpieczenia zdrowotnego. AWP, AWZ i AWD to instrukcje złożenia elektronicznych wniosków programu Aktywny Rodzic. Dla 800+ szczegóły zawierają link do kreatora SW-R w pomocy eZUS.

W wersji webowej wybierz **Otwórz formularz ZAM** w szczegółach odpowiedniego urlopu. Aplikacja wczytuje dane rodzica i dziecka z zapisanego konta rodzinnego. Uzupełnij i sprawdź dane w stałym formularzu. **Pobierz** zapisuje wypełniony urzędowy plik ZAM z osadzoną czcionką obsługującą polskie znaki. **Wyślij** otwiera eZUS, gdzie należy wybrać usługę „Złożenie dokumentu ZAM” i podpisać wniosek. Wpisane zmiany dotyczą bieżącego otwarcia formularza.

### Konta testowe ZAM

W Supabase Online użyj osobnego projektu testowego. W SQL Editorze zastosuj brakujące migracje w kolejności numerów. Ustaw w `.env` adres projektu, klucz publiczny i klucz serwerowy zgodnie z `.env.example`. Ustaw także `SUPABASE_TEST_PROJECT_REF` zgodny z adresem projektu, własne `SUPABASE_TEST_USERS_PASSWORD` (co najmniej 16 znaków) i `EXPO_PUBLIC_ENABLE_TEST_LOGIN=true`. Uruchom `npm run db:seed-test-users` i zrestartuj aplikację.

W sekcji **Konto rodzinne** wybierz logowanie do konta testowego. Adresy to `anna.zam@example.test` i `michal.zam@example.test`. Pierwsze konto ma jedno dziecko, drugie pozwala sprawdzić wybór między dwojgiem dzieci. Przy testowaniu z wbudowanym katalogiem możesz ustawić `EXPO_PUBLIC_SEED_PERSONA=ania`, aby od razu przejść do dokumentów. Skrypt obsługuje również lokalny Supabase, gdzie domyślne hasło testowe to `ZamDemo-2026!`.

### Synchronizacja treści w aplikacji

1. Start: cache (AsyncStorage) jeśli nowszy niż seed, inaczej seed – UI renderuje się od razu.
2. W tle: `content_meta.version` > lokalnej → pobranie, walidacja zod (niepoprawne rekordy są pomijane z `console.warn`), zapis w cache, podmiana.
3. Ponowienie przy powrocie aplikacji na pierwszy plan, nie częściej niż co 15 min. DevPanel: „Synchronizuj teraz”.

## Jak dodać / zmienić treść

Źródłem prawdy jest **`content/seed/*.json`** (wbudowane w aplikację) albo **arkusz CSV** (np. Google Sheets → Plik → Pobierz → CSV).

```bash
# 1. edytuj JSON albo CSV
# 2. walidacja (te same schematy zod co aplikacja)
npm run content:validate
npm run content:import -- --from content/import --format csv --dry-run
# 3. publikacja do Supabase
npm run content:import -- --from content/import --format csv
# 4. aplikacja pobierze nową wersję przy następnej synchronizacji
# 5. (opcjonalnie) odśwież wbudowany seed z bazy
npm run content:export
```

Walidacja wyłapuje: złe typy pól, nieznane klucze faktów w regułach (np. literówkę `child.premture`), zduplikowane `id`, niepoprawne URL-e, `asOf` w złym formacie, `relatedDocumentId` wskazujące nieistniejący dokument. Przy jakimkolwiek błędzie import nic nie wgrywa i wypisuje raport `plik [id] pole: komunikat`.

### Format CSV

Jeden plik na typ: `documents.csv`, `tips.csv`, `todos.csv`, `prompts.csv` (przykłady po 2 wiersze w `content/import/`). Nagłówki = nazwy pól (camelCase). **Pola złożone wpisujesz jako JSON w komórce.** Pusta komórka = brak pola. `priority` to liczba, `needsReview` to `true`/`false`.

**documents.csv**

| Kolumna | Typ | Przykład |
|---|---|---|
| `id` | slug | `becikowe` |
| `scope` | `child` \| `household` | `child` |
| `category` | `benefit` `registry` `work` `health` `education` `other` | `benefit` |
| `title`, `summary` | tekst | |
| `bodyMd` | markdown | `## Co to jest\n...` |
| `timing` | JSON | `{"showFrom": -60, "deadline": 365, "deadlineNote": "12 miesięcy od urodzenia"}` |
| `visibleWhen` | JSON (reguła, opcjonalnie) | `{"fact": "household.childrenCount", "op": "gte", "value": 3}` |
| `requirements` | JSON (lista) | `[{"id":"dochod","label":"Dochód do 1922 zł","who":"household","rule":{"fact":"household.incomePerPersonNet","op":"lte","value":1922}}]` |
| `links` | JSON (lista) | `[{"label":"Złóż wniosek","url":"https://empatia.mrips.gov.pl","kind":"apply"}]` |
| `checklist` | JSON (lista, opcjonalnie) | `["PESEL dziecka"]` |
| `assistantPrompts` | JSON (lista) | `["Czy przysługuje mi becikowe?"]` |
| `amountLabel` | tekst (opcjonalnie) | `1000 zł jednorazowo` |
| `tags` | JSON (lista) | `["becikowe","gmina"]` |
| `source` | JSON | `{"name":"gov.pl","url":"https://www.gov.pl","asOf":"2026-11"}` |
| `needsReview` | `true`/`false` | `true` |
| `priority` | 1–5 (5 = najważniejsze) | `4` |

**tips.csv**: `id, title, summaryMd, bodyMd, timing ({showFrom, showTo}), visibleWhen, tags, source, priority`
**todos.csv**: `id, title, descriptionMd, timing, visibleWhen, category (health|home|work|registry|education|other), relatedDocumentId, source, priority`
**prompts.csv**: `id, text, timing ({showFrom, showTo}), visibleWhen`

### Oś czasu: dni względem porodu

Wszystkie `timing` liczone są w **dniach względem porodu danego dziecka** (`birthDate`, a gdy go brak – `dueDate`): ujemne = ciąża, 0 = poród, dodatnie = wiek dziecka.

| Moment | Offset |
|---|---|
| tydzień ciąży **T** | **(T − 40) × 7** |
| 10. tydzień ciąży | −210 |
| 28. tydzień ciąży | −84 |
| 36. tydzień ciąży | −28 |
| poród | 0 |
| 21 dni po porodzie | 21 |
| 3 miesiące | ≈ 90 |
| 12 miesięcy | ≈ 365 |
| 3 lata | ≈ 1095 |

`showTo` pominięte = bez końca (gdy brak `deadline`) albo do `deadline + 30 dni` (żeby było widać „po terminie”). Dokumenty `scope: household` liczone są względem najmłodszego pasującego dziecka.

### Reguły (`visibleWhen`, `requirements[].rule`)

```jsonc
{ "all": [ ... ] } | { "any": [ ... ] } | { "not": { ... } } | { "fact": "<FactKey>", "op": "<Op>", "value": ... }
```

Operatory: `eq neq in notIn lt lte gt gte exists notExists`. Logika trójwartościowa: brak danych (np. dochodu) → `unknown` → w UI „Uzupełnij profil”. `in`/`eq` na listach (`anyParent.employment`) = „którykolwiek element pasuje”.

Fakty: `child.status, child.dayOffset, child.ageMonths, child.premature, child.disability, child.isMultipleBirth, me.gender, me.employment, partner.exists, partner.gender, partner.employment, anyParent.employment, household.size, household.incomePerPersonNet, household.singleParent, household.childrenCount (wszystkie, także w drodze), household.childrenUnder18Count (urodzone < 18 lat), household.city`.

---

## Architektura

```
src/
├─ app/        TYLKO routing (Expo Router). Pliki re-eksportują ekrany z features.
├─ features/   onboarding · profile · calendar · assistant · documents
│              każdy widok w swoim folderze, BEZ importów między nimi
├─ core/       kontrakty i czysta logika: schematy zod, typy, etapy, reguły,
│              selektory treści, store'y (profil, statusy, filtr), asystent, sync, nawigacja
├─ shared/     UI kit (klasy DaisyUI), motyw, i18n (pl.ts), helpery – nie zna core ani features
├─ global.css  JEDYNE źródło kolorów: tokeny motywu DaisyUI (light/dark)
└─ dev/        DevPanel + persony
content/seed   wbudowana treść (JSON)      content/import   przykładowe CSV
scripts/       validate / import / export treści (Node + tsx)
supabase/      migracja SQL, Edge Function `assistant`
```

```
         ┌──────────── features/* ────────────┐
app/ ──▶ │ calendar  documents  assistant ... │ ──▶ core/ ──▶ shared/
         └──── ✗ nie importują się nawzajem ──┘
```

### Reguły granic (wymuszone ESLintem)

1. `src/features/<X>/**` importuje tylko `@/core/**`, `@/shared/**` i własne pliki.
2. `src/core/**` nie importuje z `features` ani `dev`; `src/shared/**` nie importuje z `core` ani `features` (`ChildChip`/`ChildFilterBar` dostają dane przez propsy).
3. Pliki w `src/app/**` tylko re-eksportują ekrany: `export { CalendarScreen as default } from '@/features/calendar';`.
4. Komunikacja między widokami wyłącznie przez `core/navigation/routes.ts` (`goToDocument`, `goToAssistant`, …) i store'y w `core`.
5. Logika domenowa = czyste funkcje w `core`, przyjmujące `ContentBundle`, `Profile`, `today`.
6. Wszystkie teksty UI w `src/shared/i18n/pl.ts`.

Przykład – linter blokuje import z innej funkcji:

```ts
// src/features/calendar/components/Foo.tsx
import { DocumentsScreen } from '@/features/documents';
```

```
error  '@/features/documents' import is restricted from being used by a pattern.
       Feature "calendar" nie może importować innych funkcji. Użyj @/core (store'y, routes) albo @/shared
       no-restricted-imports
```

### Kluczowe moduły `core`

- `schemas/` – zod: profil, treść, reguły (te same schematy w aplikacji, skryptach i przy odczycie z Supabase).
- `stage/getStage.ts` – `dayOffset`, `getStage`, `offsetToDate`; `stageLabel` („28. tydzień ciąży”, „4. miesiąc życia”, „2 lata i 4 miesiące”).
- `rules/` – `buildFacts` + `evaluate` (trójwartościowo).
- `content/selectors.ts` – `getDocumentInstances`, `getDocumentInstance`, `getMonthItems`, `getDeadlineMarks`, `getTipsFor`, `getSuggestedPrompts`.
- `profile/anonymize.ts` – `toAnonymousSummary` (bez imion, dat i miejscowości). Do AI trafia tylko to + aliasy „Dziecko 1/2”; imiona podstawiane z powrotem lokalnie.
- `clock/` – `getToday()` / `useToday()` z możliwością nadpisania w DevPanelu. Logika nie używa `new Date()`.
- `assistant/` – `mockAssistant` (offline), `remoteAssistant` (Edge Function, timeout 30 s, `AbortSignal`), `humanSupport` (Supabase + kolejka lokalna ponawiana przy starcie).

## Praca nad jednym widokiem

- `EXPO_PUBLIC_SEED_PERSONA=kasia npx expo start` – pomija onboarding i wczytuje personę.
- **DevPanel** (Profil → „Panel deweloperski” w trybie dev albo 3× stuknięcie w numer wersji): zmiana daty „dzisiaj” (±tydzień/miesiąc, konkretna data), persona, tryb asystenta mock/remote, źródło i wersja treści, „Synchronizuj teraz”, czyszczenie statusów/danych.
- Persony (daty liczone względem „dzisiaj”):
  - `ania` – Anna (umowa o pracę) + Tomek (JDG), Zosia 3 miesiące, dochód nieznany,
  - `magda` – samotna mama (zlecenie), bliźnięta-wcześniaki 5 tygodni, 1500 zł/os.,
  - `kasia` – Kasia (bez pracy) + Marek (etat), dzieci 4 lata, 18 miesięcy i w drodze (24. tydz.) → Karta Dużej Rodziny, przedszkole, Aktywny rodzic.
- Asystent `mock` działa offline – nie potrzeba kluczy.

## Podział pracy (3–5 osób)

| Osoba | Zakres | Główne pliki |
|---|---|---|
| 1 | Kalendarz | `src/features/calendar/**` |
| 2 | Dokumenty | `src/features/documents/**` |
| 3 | Asystent + Edge Function | `src/features/assistant/**`, `supabase/functions/assistant` |
| 4 | Onboarding + profil | `src/features/onboarding/**`, `src/features/profile/**` |
| 5 | Treść / Supabase / skrypty | `content/**`, `scripts/**`, `supabase/migrations` |

Zmiany w `src/core/**` (kontrakty: schematy, selektory, trasy) zgłaszaj zespołowi – to wspólne API. Każdy feature ma `index.ts` eksportujący tylko ekrany.

## Interfejs: DaisyUI + Uniwind

- **Stylowanie:** klasy Tailwind v4 przez [Uniwind](https://docs.uniwind.dev) (`className` na komponentach RN, działa na iOS, Androidzie i web). Konfiguracja: `metro.config.js`, `src/global.css`.
- **Motyw w konwencji DaisyUI 5:** tokeny semantyczne `primary`, `secondary`, `accent`, `neutral`, `base-100/200/300`, `base-content`, `info`/`success`/`warning`/`error` (+ `*-content`) i promienie `rounded-box` / `rounded-field` / `rounded-selector`. Motyw jasny i ciemny przełącza się razem z ustawieniem systemu.
- **Dlaczego nie sam plugin `daisyui`?** Jego komponenty (`btn`, `card`, `badge`…) to CSS, którego React Native nie wykona (pseudo-elementy, `color-mix`). Dlatego `src/shared/ui` odwzorowuje komponenty DaisyUI na tych samych tokenach: `Button` (btn / btn-soft / btn-outline / btn-error), `Card`, `Badge` (badge-soft), `Chip`, `Alert` (alert-soft), `SegmentedControl` (tabs-box), `Stepper` (join), `ToggleRow` (toggle), `Sheet` (modal-bottom), `TextField`/`Select` (input/select), czat (chat-bubble).
- **Kolory w JS** (ikony, nawigacja, kolory dzieci): `src/shared/theme/palette.ts`. Test `palette.test.ts` pilnuje, żeby zgadzał się z `global.css`. Zmieniasz kolor → zmień oba pliki.
- **Pułapka web:** style bazowe RN-web mają pierwszeństwo przed warstwą `utilities` Tailwinda. Dla właściwości, które RN-web ustawia samo (np. `flexGrow`/`flexShrink` poziomego `ScrollView`), użyj inline `style`, nie klasy.

## Logowanie przez mObywatel (symulacja)

Pierwszy krok onboardingu (`/onboarding`, `StepLogin`). Nic nie łączy się z prawdziwym mObywatelem: `mockMObywatelService` po ~1,4 s zwraca przykładową osobę. Użytkownik widzi pobrane dane (imię, nazwisko, data urodzenia, płeć, miejscowość) i odpowiada „Tak, zgadza się” (uzupełnia imię, płeć i miejscowość w szkicu, potem krok „Twoje dane” z dopisaną formą zatrudnienia i liczbą dzieci) albo „Nie, wpiszę ręcznie” (puste pola). Nazwisko i data urodzenia **nie są zapisywane** (test w `onboardingDraft.store.test.ts`). Dane dzieci wpisuje się jak dotąd. Prawdziwa integracja: podmień `MObywatelService` (`src/features/onboarding/mobywatel/mObywatelService.ts`, `TODO(verify)` w pliku).

## Jakość i dostępność

- TypeScript strict, zero `any` w `core` (reguła ESLint).
- Testy (Vitest): etapy (granice, rok przestępny, wcześniak, termin w przeszłości), reguły trójwartościowe, `buildFacts`, selektory (dwoje dzieci, bliźnięta, household, statusy), anonimizacja (brak wycieku imion/dat), kontrast kolorów dzieci, walidacja seeda, format CSV i mapowanie snake/camel, mock asystenta.
- Dostępność: role i etykiety na przyciskach/chipach/dniach kalendarza („15 maja, 2 terminy: …”), chip dziecka ma inicjał i imię (kolor nie jest jedynym nośnikiem informacji), cele ≥ 44×44, dynamiczna wielkość czcionki, tryb jasny i ciemny.

## Znane ograniczenia i TODO

- **Treść wymaga weryfikacji merytorycznej** – każdy dokument ma `needsReview: true`; w `bodyMd` są miejsca `TODO: uzupełnić po weryfikacji` (kwoty/terminy spoza zweryfikowanej listy). Linki prowadzą na strony główne instytucji.
- `TODO(verify)`:
  - `src/shared/ui/DateField.tsx` – pole daty jest tekstowe (DD.MM.RRRR); natywny picker do rozważenia,
  - `supabase/functions/assistant/index.ts` – nazwa narzędzia web search i filtr domen w Responses API; nazwa klucza `SUPABASE_ANON_KEY` vs `SUPABASE_PUBLISHABLE_KEY`,
  - `--no-verify-jwt` przy nowych kluczach Supabase.
- Edge Function nie była uruchamiana lokalnie (brak Deno CLI w środowisku generowania) – typy sprawdzone shimami.
- Limit zapytań w Edge Function jest best-effort (pamięć instancji). Porządnie: tabela w Postgresie / Redis.
- Dokumenty dotyczące porodu (np. urlop rodzicielski) dla bliźniąt tworzą się per dziecko – do rozważenia grupowanie po `multipleBirthGroupId`.
- Uniwind i `className` na komponentach firm trzecich wymagają `withUniwind` (patrz `Screen`); na web style bazowe RN-web wygrywają z klasami Tailwinda (patrz „Interfejs”).
- Brak gestu przesuwania miesięcy w kalendarzu (strzałki działają).
- Na web `Alert` (potwierdzenia usuwania) nie wyświetla przycisków – docelowe platformy to iOS/Android.
