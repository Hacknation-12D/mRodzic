# mRodzic – urlopy, zasiłki i wnioski ZUS dla rodziców

> Projekt na hackathon. **Wszystkie dane w aplikacji są fikcyjne (SYMULACJA – DANE FIKCYJNE).** Aplikacja nie wysyła niczego do ZUS, pracodawcy, USC ani mObywatela.

## Problem

Rodzic, który spodziewa się dziecka, musi poskładać informacje z kilku miejsc: ZUS, kodeksu pracy, poradników i forów. Musi ustalić, czy przysługuje mu zasiłek, w jakiej wysokości, jak podzielić urlop z partnerem, jaki wniosek złożyć, komu i w jakim terminie. Przy bliźniętach, adopcji, umowie zlecenia, własnej firmie lub utracie dziecka sprawa robi się jeszcze trudniejsza.

## Rozwiązanie

**mRodzic** to aplikacja webowa/mobilna (iOS, Android i web), która:

1. **Pobiera dane rodziny** po symulowanym zalogowaniu przez mObywatel. Dane rodziców, dzieci, ubezpieczenia i składek pochodzą z fikcyjnych rejestrów ZUS, PUE, e-ZLA i USC.
2. **Ocenia prawo do świadczeń** i podaje uzasadnienie, również wtedy, gdy świadczenie nie przysługuje.
3. **Liczy kwotę i długość urlopów** dla obojga rodziców i pomaga je podzielić.
4. **Prowadzi przez wniosek** – od danych, przez formularz ZAM i plik PDF, do złożenia w symulacji.
5. **Odpowiada na pytania** w czacie z asystentem AI. Do modelu nie trafiają imiona, daty ani miejscowości.

## Co można zobaczyć w aplikacji

| Ekran | Co robi |
|---|---|
| **Logowanie (mObywatel – symulacja)** | Losuje jeden z 10 profili DEMO albo pozwala wybrać konkretny. Pokazuje pobrane dane i pyta „Czy te dane się zgadzają?”. |
| **Start** | Szacunkowy zasiłek macierzyński (miesięcznie, długość urlopu), lista dzieci z oznaczeniem zaległych terminów, skróty. |
| **Dokumenty** | Sprawy dopasowane do rodziny, podzielone na „Przysługuje” i „Nie przysługuje”. Sekcja „Uzupełnij dane” zbiera sprawy, których nie da się ocenić bez dodatkowych informacji. W szczegółach są terminy, lista dokumentów, linki i oryginalne formularze ZUS (PDF). |
| **Kalkulator świadczeń** (`/calculator`) | Jeden zintegrowany kalkulator: narodziny, ciąża, **zwolnienie w ciąży** (wynagrodzenie chorobowe i zasiłek 100%, okres wyczekiwania 30/90 dni, limit 270 dni, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego po utracie pracy), adopcja, rodzina zastępcza. Prawo do zasiłku z uzasadnieniem, kwoty **obojga rodziców** (każde z własną podstawą), przejęcie macierzyńskiego przez ojca, uzupełniający urlop macierzyński (wcześniak, szpital), warianty 100%/81,5%, oś czasu, ryzyka (przedłużenie umowy do porodu, pozorność umowy, podwyższona podstawa, zadłużenie JDG, termin 21 dni). |
| **Plan rodziny** (`/family-plan`) | Podział urlopu rodzicielskiego między rodziców, gotowe warianty, części jednoczesne, łączenie z pracą do ½ etatu (wydłużenie urlopu i pomniejszony zasiłek), kwoty dla każdego rodzica. |
| **Wnioski do pracodawcy i USC** (`/requests`) | Zaprojektowane wnioski urlopowe (macierzyński, macierzyński + rodzicielski, rodzicielski, łączenie z pracą, ojcowski, rezygnacja i przejęcie macierzyńskiego) z kontrolą terminów i limitów; wniosek o odpis aktu urodzenia; zaświadczenie o stanie rozliczeń z ZUS. PDF z polskimi znakami i wysyłka w symulacji z historią. |
| **Wsparcie** (`/support`) | Zweryfikowane organizacje non-profit (strata dziecka, poronienie, wcześniak, ciężka choroba, kryzys) dobrane do sytuacji z profilu oraz oficjalne źródła: ZUS, MRPiPS, PIP, gov.pl. |
| **Panel administracyjny** (`/admin`) | Zmiana parametrów prawnych bez nowej wersji aplikacji: stawki, wymiary urlopów, płaca minimalna, limity, terminy. Walidacja, podgląd skutków zmiany, wersje, historia, import/eksport JSON. |
| **Wnioski** (`/applications`) | Kreator w 6 krokach: Dane ZUS → Analiza PDF (OCR w przeglądarce) → Prawo i kwota → Formularz ZAM → PDF i złożenie w symulacji → Moje wnioski (historia). |
| **Asystent** | Czat o urlopach i zasiłkach ze wskazaniem źródeł oraz formularz „Zapytaj człowieka”. |
| **Profil** | Dane rodziców i dzieci, dane z PUE/eZUS, dziecko w drodze, akcja „Urodziło się!”, obsługa utraty dziecka. |

## Gdzie działa sztuczna inteligencja

| Funkcja | AI? | Jak |
|---|---|---|
| Asystent (czat) | **tak** | Model językowy (DeepSeek / OpenAI) dostaje zanonimizowany opis rodziny; bez klucza – tryb offline na regułach. Odpowiedź z modelu jest oznaczona w czacie. |
| Analiza PDF (krok 2 wniosku) | **częściowo** | OCR Tesseract (model rozpoznawania tekstu) w przeglądarce; pola wymagają potwierdzenia przez użytkownika. Plik nie trafia do serwera ani do modelu językowego. |
| Kalkulatory, ocena prawa, wnioski, panel administracyjny, katalog wsparcia | **nie** | Deterministyczne reguły z ustawy zasiłkowej i Kodeksu pracy (`core/benefits`, `core/applications`, `core/requests`), pokryte testami. |

AI wspierało także proces tworzenia kodu i dokumentacji.

## Asystent AI

Asystent sam wybiera, skąd bierze odpowiedzi. Sprawdza możliwości w tej kolejności:

1. **Model językowy (DeepSeek albo OpenAI)** – gdy w `.env` jest klucz API dostawcy wybranego w `settings.json`. Aplikacja łączy się z dostawcą bezpośrednio, przez endpoint `/chat/completions` (oba używają formatu OpenAI).
2. **Supabase Edge Function `assistant`** (OpenAI po stronie serwera) – gdy ustawiono `EXPO_PUBLIC_ASSISTANT_MODE=remote` i skonfigurowano Supabase. Model ustawia sekret `OPENAI_MODEL`.
3. **Tryb offline (mock)** – w pozostałych przypadkach. Odpowiada na podstawie wbudowanej treści aplikacji i nie potrzebuje internetu.

Dostawcę i model wybiera się w [settings.json](settings.json):

```json
{
  "AI_PROVIDER": "deepseek",
  "DEEPSEEK_MODEL": "deepseek-flash",
  "OPENAI_MODEL": "gpt-4.1-mini"
}
```

| `AI_PROVIDER` | Model (domyślny) | Adres API | Klucz w `.env` |
|---|---|---|---|
| `deepseek` (**domyślnie**) | `deepseek-flash` (`DEEPSEEK_MODEL`) | `https://api.deepseek.com` | `EXPO_PUBLIC_DEEPSEEK_API_KEY` |
| `openai` | `gpt-4.1-mini` (`OPENAI_MODEL`) | `https://api.openai.com/v1` | `EXPO_PUBLIC_OPENAI_API_KEY` |

Klucz musi należeć do wybranego dostawcy. Jeśli `AI_PROVIDER` to `openai`, a w `.env` jest tylko klucz DeepSeek, asystent działa offline.

**Co trafia do modelu**

- Zanonimizowany opis rodziny – bez imion, dat i miejscowości. Dzieci mają aliasy „Dziecko 1/2”, a imiona aplikacja podstawia z powrotem lokalnie.
- Dokumenty z najbliższymi terminami dla tej rodziny oraz dokument, z którego użytkownik przeszedł do czatu.
- Ostatnie 2 pary pytanie–odpowiedź i bieżące pytanie.

**Parametry:** `temperature` 0,3, limit czasu 50 s, odpowiedzi do ok. 300 znaków, po polsku. Model ma nie zmyślać kwot ani terminów i odsyłać do oficjalnych źródeł. Instrukcja systemowa jest w [systemPrompt.ts](src/features/assistant/llm/systemPrompt.ts).

**Gdy model nie odpowiada** (błąd sieci, limit czasu, błąd API), aplikacja zwraca odpowiedź trybu offline i oznacza ją w dymku czatu. Pod każdą odpowiedzią jest przycisk „Zapytaj człowieka”.

## Scenariusz demo (ok. 3 minuty)

1. Uruchom aplikację (patrz niżej) i wybierz **Zaloguj przez mObywatel (demo)** → profil **P01 – Anna**.
2. Ekran **Start**: szacunkowy zasiłek i lista dzieci.
3. **Dokumenty** → otwórz zasiłek macierzyński: ocena prawa, terminy, formularze.
4. **Kalkulator świadczeń**: kwota dzienna i oś czasu urlopów obojga rodziców; kafelek **Zwolnienie w ciąży** (najlepiej na profilu P03).
5. **Panel administracyjny**: zmień stawkę rodzicielskiego na 75% (nowa wersja np. `2027.1`) i wróć do kalkulatora – kwota przelicza się od razu.
6. **Wnioski**: przejdź 6 kroków – dane ZUS, ocena prawa, formularz ZAM, pobranie PDF i złożenie w symulacji. Wniosek zostaje w historii po odświeżeniu strony.
7. Wyloguj się i zaloguj jako **P04 – Alicja (studentka)**. Aplikacja odmawia zasiłku i podaje uzasadnienie (brak tytułu ubezpieczenia).

### Profile DEMO

| ID | Osoba | Przypadek |
|---|---|---|
| P01 | Anna | Etat, zasiłek wypłaca pracodawca, partner prowadzi firmę |
| P02 | Marta | Własna firma z zaległościami w ZUS, ciąża |
| P03 | Julia | Umowa zlecenie od niedawna, okres wyczekiwania, e-ZLA |
| P04 | Alicja | Studentka bez ubezpieczenia chorobowego (odmowa) |
| P05 | Iga | Wcześniacze bliźnięta w szpitalu, urlop uzupełniający |
| P06 | Elżbieta | Adopcja dziecka 6-letniego |
| P07 | Piotr | Niezawodowa rodzina zastępcza, odroczenie obowiązku szkolnego |
| P08 | Monika | Utrata dziecka – **tylko z wyboru ręcznego**, nie bierze udziału w losowaniu |
| P09 | Weronika | Likwidacja pracodawcy w czasie ciąży |
| P10 | Natalia | „Za życiem”, urlop rodzicielski łączony z pracą |

Stan danych testowych: **21.11.2026**.

## Szybki start

Wymagania: **Node 22.5+** (testowane na Node 24).

```bash
npm install
npx expo start
```

Naciśnij `w`, żeby otworzyć wersję web, albo zeskanuj kod QR w **Expo Go**. **Plik `.env` nie jest potrzebny** – aplikacja działa offline na wbudowanych danych DEMO, z asystentem w trybie offline.

Kreator wniosków z analizą PDF i pobieraniem formularza ZAM działa w wersji **web**.

## Konfiguracja (opcjonalna)

Skopiuj `.env.example` do `.env`. Każda zmienna jest opcjonalna. Brak zmiennej oznacza tryb offline.

| Co chcesz włączyć | Co ustawić |
|---|---|
| Asystent AI na prawdziwym modelu (tylko do testów) | `EXPO_PUBLIC_DEEPSEEK_API_KEY` (model `deepseek-flash`) albo `EXPO_PUBLIC_OPENAI_API_KEY` (model `gpt-4.1-mini`); dostawcę wybierasz w `settings.json` – patrz [Asystent AI](#asystent-ai) |
| Asystent przez Supabase Edge Function | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_ASSISTANT_MODE=remote` |
| Parametry prawne z serwera | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` + migracja `0005` |
| Dane DEMO z lokalnego API SQLite | `npm run demo:server`, potem `EXPO_PUBLIC_DEMO_API_URL=http://127.0.0.1:8765` |

> Klucze `EXPO_PUBLIC_*` trafiają do paczki aplikacji. Klucze do modeli AI ustawiaj tylko lokalnie, na czas testów. Klucz `SUPABASE_SERVICE_ROLE_KEY` służy wyłącznie skryptom i nigdy nie trafia do aplikacji.

<details>
<summary><b>Supabase krok po kroku</b></summary>

1. Załóż projekt na [supabase.com](https://supabase.com) i wpisz URL oraz klucze do `.env`.
2. Połącz projekt i utwórz tabele:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push            # migracje z supabase/migrations
   ```
   Możesz też uruchomić w SQL Editorze pliki z `supabase/migrations` w kolejności numerów, a potem `supabase/seed.sql`.
3. Wgraj treści: `npm run content:import -- --from content/seed --format json`.
4. Asystent przez Edge Function:
   ```bash
   npx supabase secrets set OPENAI_API_KEY=sk-... OPENAI_MODEL=<model> OPENAI_WEB_SEARCH=false
   npx supabase functions deploy assistant
   ```
5. Parametry prawne: migracja `0005_legal_parameters.sql` tworzy tabelę wersji parametrów. Aplikacja przy starcie pobiera najnowszy opublikowany zestaw (`published = true`). Zestaw przygotujesz w panelu `/admin` (eksport JSON) i opublikujesz kluczem serwerowym.

Tabele: `content_*` (katalog treści z wersjonowaniem), `support_requests` („Zapytaj człowieka”), `legal_parameters` (wersje parametrów prawnych), `family_parents` i `family_children` (profile rodzin, używane przez prefill formularza ZAM).

</details>

## Pokrycie wymagań ZUS

Szczegóły, status i testy każdego wymagania: **[docs/REQUIREMENTS_MATRIX.md](docs/REQUIREMENTS_MATRIX.md)**.

- **Działa:** zintegrowany kalkulator (ciąża i zwolnienie, narodziny, adopcja, rodzina zastępcza), kwoty obojga rodziców, przejęcie macierzyńskiego, uzupełniający urlop, łączenie rodzicielskiego z pracą, ryzyka utraty prawa, wnioski do pracodawcy i USC, zaświadczenie o rozliczeniach, katalog organizacji wsparcia, panel administracyjny parametrów, wniosek ZAM od danych do złożenia w symulacji.
- **Częściowo:** analiza PDF/OCR prawdziwych formularzy z zestawów ZUS (rozpoznawany jest format syntetyczny; pozostałe dane wpisuje się ręcznie).

Zasady prawne zastosowane w kodzie (m.in. martwe urodzenie, zasiłek pogrzebowy, likwidacja pracodawcy, zadłużenie składkowe) opisuje ten sam dokument.

## Technologie

- **Expo SDK 58**, React Native 0.88, React 19, Expo Router, TypeScript (tryb strict)
- **Uniwind** (Tailwind v4) z jasnym motywem w konwencji DaisyUI
- **zustand** (stan i zapis lokalny), **zod** (te same schematy w aplikacji, skryptach i bazie)
- **pdf-lib** (wypełnianie oryginalnego formularza ZAM, polskie znaki), **pdf.js + tesseract.js** (OCR w przeglądarce)
- **Supabase** (opcjonalnie: treści, parametry prawne, Edge Function asystenta), **DeepSeek `deepseek-flash`** (do testów) / **OpenAI `gpt-4.1-mini`** (asystent AI)
- **SQLite** (`node:sqlite`) jako źródło fikcyjnych danych ZUS, PUE, e-ZLA i USC
- **Vitest**, ESLint z regułami granic architektury

## Struktura projektu

```
src/
├─ app/        tylko routing (Expo Router) – pliki re-eksportują ekrany z features
├─ features/   home · onboarding · documents · calculator · assistant · profile · support · admin
├─ core/       czysta logika: świadczenia, wnioski, reguły, schematy, store'y, nawigacja
├─ shared/     UI kit, motyw, teksty (i18n/pl.ts), helpery
└─ dev/        DevPanel i persony
content/seed   wbudowana treść (dokumenty, porady, zadania)
public/pdfs    oryginalne formularze i instrukcje ZUS
scripts/       walidacja i import treści, generator danych DEMO
supabase/      migracje SQL, Edge Function `assistant`
docs/          macierz wymagań
```

Najważniejsze moduły logiki:

- `core/benefits/` – urlopy macierzyński, rodzicielski, ojcowski i uzupełniający, podstawa wymiaru, kwota zasiłku, chorobowe w ciąży, plan rodziny. Kwoty liczone są w groszach.
- `core/legal/` – **jedno źródło parametrów prawnych** (schemat zod, wartości 2026, wersje z panelu i z Supabase). Kalkulatory i silnik wniosku czytają je przy każdym obliczeniu.
- `core/applications/` – silnik oceny prawa, workflow wniosku, pola formularza ZAM.
- `core/requests/` – wnioski urlopowe do pracodawcy, odpis aktu urodzenia, zaświadczenie o rozliczeniach (terminy, walidacja, treść PDF).
- `core/support/` – katalog organizacji wsparcia i oficjalnych źródeł.
- `core/rules/` i `core/content/` – reguły trójwartościowe (`tak` / `nie` / `brak danych`) dopasowujące dokumenty do rodziny.
- `core/profile/anonymize.ts` – anonimizacja profilu przed wysłaniem do AI.

Zasady architektury pilnuje ESLint: moduły z `features/` nie importują się nawzajem, `core/` nie zna `features/`, a `shared/` nie zna `core/`. Wszystkie teksty interfejsu są w `src/shared/i18n/pl.ts`.

## Skrypty

| Skrypt | Co robi |
|---|---|
| `npm start` / `npm run web` | serwer Expo / wersja web |
| `npm run check` | typecheck + lint + testy + walidacja treści |
| `npm test` | testy Vitest (świadczenia, scenariusze, workflow, PDF, reguły) |
| `npm run demo:server` | lokalne API z danymi DEMO (SQLite, port 8765) |
| `npm run demo:build` | odświeża wbudowany snapshot danych DEMO |
| `npm run build:web` | snapshot + zasoby PDF + eksport web do `dist/` |
| `npm run content:validate` | walidacja `content/seed/*.json` |
| `npm run content:import -- --from <dir> --format csv\|json [--dry-run]` | import treści do Supabase |

## Wskazówki dla developerów

- **DevPanel**: w Profilu stuknij 3 razy w numer wersji. Pozwala zmienić datę „dzisiaj”, wybrać profil DEMO, przełączyć tryb asystenta i zsynchronizować treść.
- **Oś czasu** w treściach liczona jest w dniach względem porodu: ujemne liczby oznaczają ciążę, `0` to poród, dodatnie to wiek dziecka. Tydzień ciąży `T` = `(T − 40) × 7`.
- **Treści** edytujesz w `content/seed/*.json` albo w CSV (`content/import/`). Przed importem uruchom `npm run content:validate`.
- **Kolory** zmieniasz w dwóch miejscach: `src/global.css` i `src/shared/theme/palette.ts`. Zgodność obu plików sprawdza test.
- Więcej o bazie DEMO i jej API: **[README_INTEGRACJA.md](README_INTEGRACJA.md)**.

## Ograniczenia

- To **prototyp**. Wynik aplikacji nie jest decyzją ZUS.
- Logowanie przez mObywatel, rejestry ZUS i składanie wniosków są **symulowane**.
- Panel administracyjny zapisuje zmiany lokalnie; publikacja dla wszystkich użytkowników wymaga tabeli `legal_parameters` w Supabase i roli administratora po stronie serwera.
- OCR słabo radzi sobie ze skanami niskiej jakości. Wyniki analizy PDF trzeba sprawdzić ręcznie.
- Formularz ZAM, analiza PDF i pobieranie plików działają w wersji web. Na iOS i Androidzie działa przegląd, kalkulatory i asystent.
