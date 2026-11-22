# mRodzic – macierz wymagań ZUS (stan na 22.11.2026)

Status: **działa** = dostępne w aplikacji i pokryte testem · **częściowo** = działa z ograniczeniem opisanym obok · **brak** = nie zrobione.
Wszystkie dane są fikcyjne (SYMULACJA – DANE FIKCYJNE). Żaden wniosek nie jest wysyłany do ZUS, pracodawcy ani USC.

## Wymagania a–j

| | Wymaganie | Status | Gdzie | Uwagi / testy |
|---|---|---|---|---|
| a | Świadczenia w ciąży, w tym brak uprawnienia | działa | `/calculator` → „Zwolnienie w ciąży” (`core/benefits/pregnancyScenario.ts`) | Wynagrodzenie chorobowe 33/14 dni, zasiłek 100% przy kodzie B, okres wyczekiwania 30/90 dni (z wyjątkami), limit 270 dni, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego do porodu (art. 30 ust. 3), brak tytułu ubezpieczenia. e-ZLA z PUE wczytywane automatycznie. Testy: `pregnancyScenario.test.ts` |
| b | Kalkulator dla obojga rodziców, liczba dzieci, „Za życiem” | działa | `/calculator` | Każdy rodzic: własne prawo i podstawa; 9 tyg. nieprzenoszalne (70%), ojcowski (100%), przejęcie macierzyńskiego przez ojca (po 14 tyg. lub wcześniej: szpital, niezdolność, śmierć, porzucenie), uzupełniający urlop macierzyński (wcześniak / szpital), suma dla rodziny. Testy: `scenario.test.ts` |
| c | Rodzicielski łączony z pracą | działa | `/family-plan` (`familyLeavePlan.ts`) | Praca do ½ etatu, wydłużenie urlopu (art. 182¹e KP), zasiłek pomniejszony o wymiar pracy, wariant „praca także w okresie wydłużenia”. Wniosek do pracodawcy w `/requests` |
| d | Podział urlopu między rodziców, jednoczesność | działa | `/family-plan`, `/calculator` | Gotowe warianty planu, części jednoczesne, limit puli i 5 części, start po macierzyńskim, granica roku 6. urodzin, kwoty dla każdego rodzica |
| e, j | Adopcja i rodzina zastępcza niezawodowa | działa | `/calculator` | Granice wieku: 14 lat (adopcja), 7 / 10 lat przy odroczeniu szkoły (rodzina zastępcza); min. 9 tygodni. Test: `scenario.test.ts` |
| f | Indywidualna podstawa wymiaru, sprawy konkursowe | częściowo | `benefitBase.ts` (wspólna funkcja dla kalkulatora, planu i wniosku) | Podstawa z 12 miesięcy, minimum dla etatu, limit dla nie-pracowników – identyczna na wszystkich ekranach. **OCR rozpoznaje format syntetyczny; dane z prawdziwych formularzy z zestawów ZUS wpisuje się ręcznie.** |
| g | Dokumenty, terminy, odbiorca (pracodawca/ZUS), kreatory | działa | `/applications`, `/requests`, `/documents` | ZAM od danych do złożenia w symulacji; zaprojektowane wnioski urlopowe do pracodawcy z kontrolą terminów (21 dni rodzicielski, 7 dni ojcowski i przejęcie macierzyńskiego, 21 dni po porodzie dla 81,5%); odbiorca wg płatnika (> 20 ubezpieczonych) |
| h | Ryzyka utraty prawa / zmiany kwoty | działa | `/calculator` | Termin 21 dni na 81,5%, zadłużenie JDG (art. 2a), ustanie umowy przed porodem, przedłużenie umowy terminowej do porodu (art. 177 § 3 KP), pozorność umowy, podwyższenie podstawy w ciąży, wyrejestrowanie z dobrowolnego chorobowego, utrata 9 tygodni |
| i | Organizacje charytatywne | działa | `/support` (`core/support/organizations.ts`) | 7 zweryfikowanych organizacji non-profit (strona i telefon sprawdzone 22.11.2026), dobór do sytuacji z profilu, link z ekranu po stracie dziecka |

## Symulacje dodatkowe

| Wymaganie | Status | Gdzie |
|---|---|---|
| Logowanie mObywatel (symulacja), losowanie profilu (P08 tylko ręcznie) | działa | `/onboarding` |
| Dane ZUS / PUE / eZUS (ubezpieczenie, płatnik, podstawy, zadłużenie, świadczenia) | działa | `/applications` krok 1, `/profile` |
| Zaświadczenie o stanie zadłużenia na dzień powstania prawa | działa | `/requests` → „Zaświadczenie ZUS” (PDF) |
| e-ZLA, hospitalizacje, rejestr USC, przyjęcie dziecka, „Za życiem” | działa | `/applications` krok 1, `/calculator` (zwolnienie w ciąży) |
| Wypełnianie i składanie wniosków o urlopy i świadczenia (symulacja) | działa | `/applications` (ZAM), `/requests` (urlopy do pracodawcy) |
| Odpis aktu urodzenia (USC) | działa | `/requests` → „Odpis aktu” (opłata, sposób odbioru, PDF, link do gov.pl) |
| Przekierowanie do ZUS, MRPiPS, PIP | działa | `/support` → „Oficjalne informacje” |
| Analiza PDF / OCR | częściowo | `/applications` krok 2 (web, lokalnie w przeglądarce) |
| Panel administracyjny parametrów prawnych | działa | `/admin` (`core/legal/`), migracja `0005_legal_parameters.sql`. Test: `parameters.test.ts` |

## Zasady prawne sprawdzone z materiałami konkursowymi

- Dziecko w drodze nie jest ubezpieczone i nie ma PESEL ani aktu urodzenia; dziecko utracone nie jest ubezpieczone; urodzone dzieci pochodzą z rejestru (dane, schemat, walidacja bazy).
- Martwe urodzenie / zgon przed 8. tygodniem: urlop macierzyński 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu (art. 180¹ KP).
- Zasiłek pogrzebowy po martwym urodzeniu: 7000 zł, wniosek do ZUS w ciągu 12 miesięcy od pochówku (Poradnik ZUS 2026).
- Ubezpieczenie ustało w ciąży wskutek likwidacji / upadłości / śmierci pracodawcy lub z naruszeniem prawa: zasiłek macierzyński przysługuje (art. 30 ustawy zasiłkowej).
- Zadłużenie składkowe JDG > 1% minimalnego wynagrodzenia w dniu powstania prawa: świadczenie do czasu spłaty; przedawnienie po 6 miesiącach (art. 2a).
- Wariant 81,5%: wniosek najpóźniej 21 dni po porodzie (Poradnik ZUS 2026, art. 30a).

## Testy

`npm run typecheck`, `npm run lint`, `npm test` (255 testów, 26 plików), `npm run content:validate` – przechodzą. Ręczny E2E w przeglądarce (headless Edge, build web): P01 logowanie → dane ZUS → ocena prawa (kwota 207,10 zł/dzień, 140 dni) → ZAM → PDF → złożenie w symulacji → historia po odświeżeniu; P04 – odmowa z uzasadnieniem, bez kwoty i bez możliwości złożenia. Rozdzielczości: 1280 px i 420 px.
