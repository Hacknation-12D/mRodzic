# mRodzic – macierz wymagań ZUS (stan na 22.11.2026)

Status: **działa** = dostępne w aplikacji i pokryte testem · **częściowo** = działa z ograniczeniem opisanym obok · **brak** = nie zrobione.
Wszystkie dane są fikcyjne (SYMULACJA – DANE FIKCYJNE). Żaden wniosek nie jest wysyłany do ZUS, pracodawcy ani USC.

## Wymagania a–j

| | Wymaganie | Status | Gdzie | Uwagi / testy |
|---|---|---|---|---|
| a | Świadczenia w ciąży, w tym brak uprawnienia | częściowo | `core/applications/engine.ts` (chorobowy w ciąży: kod B, okres wyczekiwania 30/90 dni, limit 270 dni), `core/benefits/scenario.ts` | Odmowa z uzasadnieniem: brak tytułu ubezpieczenia (P04), zadłużenie JDG (art. 2a), ustanie ubezpieczenia. Świadczenie rehabilitacyjne i zasiłek w wysokości macierzyńskiego → stan `unknown` (wymaga dokumentów). Testy: `scenario.test.ts`, `workflow.test.ts` |
| b | Kalkulator dla obojga rodziców, liczba dzieci, „Za życiem” | działa | `/calculator`, `/family-plan` | 9 tygodni nieprzenoszalnych, bliźnięta, „Za życiem” 65/67 tyg. Testy: `scenario.test.ts` |
| c | Rodzicielski łączony z pracą | częściowo | `/family-plan` (`familyLeavePlan.ts`) | Wydłużenie wg wymiaru pracy (do ½ etatu); stawka 70%. Nie zweryfikowano na przykładach z poradnika |
| d | Podział urlopu i wypłat między rodziców, jednoczesność | działa | `/calculator` (oś czasu), `/family-plan` (jednoczesne części, limit puli i 5 części) | |
| e, j | Adopcja i rodzina zastępcza niezawodowa | działa | `/calculator` | Granice wieku: 14 lat (adopcja), 7 / 10 lat przy odroczeniu szkoły (rodzina zastępcza). Test: `scenario.test.ts` |
| f | Indywidualna podstawa wymiaru, testy na sprawach konkursowych | częściowo | `benefitBase.ts`, dane ZUS profilu | Podstawa z 12 miesięcy, kwoty w groszach. **Sprawy konkursowe: 87 w prywatnym manifeście, 1 sprawa (8 stron) przetworzona OCR lokalnie, pewność 18–41%, 0 zweryfikowanych** – brak testów zgodności z decyzjami |
| g | Dokumenty, terminy, odbiorca (pracodawca/ZUS), kreatory | częściowo | `/applications`, `/documents` | ZAM (wzór od 24.10.2026) – wypełnienie, walidacja, PDF, symulowane złożenie, historia. Odbiorca: pracownik – pracodawca; JDG i zlecenie – ZUS. Wypłaca: pracodawca przy > 20 ubezpieczonych, w pozostałych przypadkach ZUS (kalkulator). Pisma do pracodawcy, USC, Z-3/Z-3a, ZAS-53 – **brak** |
| h | Ryzyka utraty prawa / zmiany kwoty | działa | `/calculator` (karta prawa i ostrzeżenia) | Termin 21 dni na 81,5%, zadłużenie JDG, ustanie umowy przed porodem, utrata 9 tygodni |
| i | Katalog organizacji charytatywnych | brak | – | Na ekranie po stracie dziecka jest tylko ogólna wskazówka |

## Symulacje dodatkowe

| Wymaganie | Status | Gdzie |
|---|---|---|
| Logowanie mObywatel (symulacja), losowanie profilu (P08 tylko ręcznie) | działa | `/onboarding` |
| Dane ZUS / PUE / eZUS (ubezpieczenie, płatnik, podstawy, zadłużenie, świadczenia) | działa | `/applications` krok 1, `/profile` |
| e-ZLA, hospitalizacje, rejestr USC, przyjęcie dziecka, „Za życiem” | działa (podgląd) | `/applications` krok 1 (snapshot z SQLite) |
| Wypełnianie i składanie wniosku (symulacja) | działa (ZAM) | `/applications` kroki 3–6 |
| Odpis aktu urodzenia (USC) | brak | – |
| Analiza PDF / OCR | częściowo | `/applications` krok 2 (web, lokalnie w przeglądarce); niska jakość OCR na skanach |
| Panel administracyjny parametrów prawnych | brak | parametry w `core/benefits/common.ts`, `LEGAL_2026` w `engine.ts` |

## Zasady prawne sprawdzone z materiałami konkursowymi

- Dziecko w drodze nie jest ubezpieczone i nie ma PESEL ani aktu urodzenia; dziecko utracone nie jest ubezpieczone; urodzone dzieci pochodzą z rejestru (dane, schemat, walidacja bazy).
- Martwe urodzenie / zgon przed 8. tygodniem: urlop macierzyński 8 tygodni po porodzie, nie krócej niż 7 dni od zgonu (art. 180¹ KP).
- Zasiłek pogrzebowy po martwym urodzeniu: 7000 zł, wniosek do ZUS w ciągu 12 miesięcy od pochówku (Poradnik ZUS 2026).
- Ubezpieczenie ustało w ciąży wskutek likwidacji / upadłości / śmierci pracodawcy lub z naruszeniem prawa: zasiłek macierzyński przysługuje (art. 30 ustawy zasiłkowej).
- Zadłużenie składkowe JDG > 1% minimalnego wynagrodzenia w dniu powstania prawa: świadczenie do czasu spłaty; przedawnienie po 6 miesiącach (art. 2a).
- Wariant 81,5%: wniosek najpóźniej 21 dni po porodzie (Poradnik ZUS 2026, art. 30a).

## Testy

`npm run typecheck`, `npm run lint`, `npm test` (238 testów, 23 pliki) – przechodzą. Ręczny E2E w przeglądarce (headless Edge, build web): P01 logowanie → dane ZUS → ocena prawa (kwota 207,10 zł/dzień, 140 dni) → ZAM → PDF → złożenie w symulacji → historia po odświeżeniu; P04 – odmowa z uzasadnieniem, bez kwoty i bez możliwości złożenia. Rozdzielczości: 1280 px i 420 px.
