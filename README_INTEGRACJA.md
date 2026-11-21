# mRodzic – baza demonstracyjna SQLite (10 profili)

## Co jest w środku

**Źródło prawdy:** `mrodzic_zus_demo.sqlite` – otwieralne przez SQLite / DB Browser for SQLite. Można je umieścić po stronie serwera. W bazie **nie ma prawdziwych danych ani połączeń** z ZUS, mObywatelem, eZLA, sądami, szpitalami lub USC.

Pozostałe pliki:

- `schema.sql` – definicje wszystkich tabel, kluczy obcych, indeksów i widoków;
- `build_demo_db.py` – generator pozwalający odtworzyć bazę;
- `mock_server.py` – działające, lokalne API HTTP korzystające **bezpośrednio z SQLite**;
- `mrodzic_demo_profiles.json` – pełny eksport profili i powiązanych danych (np. do statycznej demonstracji w przeglądarce);
- `mrodzic_compat_profiles_v1.json` – eksport uproszczony zgodny strukturalnie z aktualnym `src/core/schemas/profile.ts` projektu mRodzic;
- `demoMObywatelAdapter.example.ts` – przykład podmiany aktualnego mocka logowania w Expo.

## Scenariusze

| ID | Profil | Przypadek | Losowanie domyślne |
| --- | --- | --- | --- |
| P01 | Anna – etat + partner JDG | Duży płatnik, urodzone dziecko, bieżąca wypłata macierzyńskiego | tak |
| P02 | Marta – JDG i zaległości | Dobrowolne chorobowe, zaległość, ciąża | tak |
| P03 | Julia – zlecenie od października | Okres wyczekiwania + zwolnienie e-ZLA | tak |
| P04 | Alicja – studentka | Brak chorobowego; tata pracownik | tak |
| P05 | Iga – wcześniacze bliźnięta | Dwoje hospitalizowanych dzieci i uzupełniający urlop | tak |
| P06 | Elżbieta – adopcja | Wniosek sądowy, dziecko 6-letnie | tak |
| P07 | Piotr – rodzina zastępcza | Opieka niezawodowa nad dzieckiem 9-letnim z odroczeniem szkoły | tak |
| P08 | Monika – utrata dziecka | Martwe urodzenie, dokument szpitalny, 8 tygodni | **nie** – scenariusz wrażliwy, wybór ręczny |
| P09 | Weronika – likwidacja pracodawcy | Ustanie zatrudnienia w ciąży, szczególne uprawnienia | tak |
| P10 | Natalia – „Za życiem” | Zaświadczenie, urlop rodzicielski łączony z pracą, dwójka rodziców | tak |

Daty to **stan testowy na 21.11.2026**. Stany zadłużenia i okresy historyczne nie są automatycznie rozstrzygnięciem przyszłego prawa do świadczenia.

## Jak uruchomić bazę i API

Wymagany jedynie Python 3.10+ (bez bibliotek zewnętrznych).

```bash
# katalog zawierający te pliki
cd mrodzic_demo_bundle

# baza już jest gotowa; gdy chcesz odtworzyć ją od zera:
python build_demo_db.py

# lokalny serwer (tylko na komputerze)
python mock_server.py --port 8765
```

Przykładowe adresy:

- `GET http://127.0.0.1:8765/health`
- `GET http://127.0.0.1:8765/api/demo-profiles` – lista 10 profilów;
- `POST http://127.0.0.1:8765/api/demo-login` body `{}` – **losowanie spośród 9 zwykłych profilów**;
- `POST http://127.0.0.1:8765/api/demo-login` body `{"profileId":"P05"}` – wybór konkretnej osoby;
- `POST http://127.0.0.1:8765/api/demo-login` body `{"includeSensitive":true}` – losowanie także profilu wrażliwego (opcjonalne);
- `GET http://127.0.0.1:8765/api/demo-snapshot/P05` – cały zestaw ZUS/PUE/eZLA/USC dla P05;
- `GET http://127.0.0.1:8765/api/mock/mobywatel/P01` – kształt aktualnego mocka mObywatel;
- `GET http://127.0.0.1:8765/api/mock/pue/P01` – konto i ubezpieczenia;
- `GET http://127.0.0.1:8765/api/mock/zus/P02` – składki, dług i pozostałe dane;
- `GET http://127.0.0.1:8765/api/mock/ezla/P03` – historia zwolnień;
- `GET http://127.0.0.1:8765/api/mock/usc/P06` – stan cywilny i dane dziecka.

Przykład logowania przez curl:

```bash
curl -X POST 'http://127.0.0.1:8765/api/demo-login' \
  -H 'Content-Type: application/json' -d '{}'
```

## Jak podmienić istniejące persony w mRodzic

Aktualny kod ma trzy ręcznie zdefiniowane persony `ania / magda / kasia` w `src/dev/personas.ts`, opcję `EXPO_PUBLIC_SEED_PERSONA` i niezależny `mockMObywatelService` w `src/features/onboarding/mobywatel/mObywatelService.ts`.

**Docelowe rozwiązanie:** jedna baza jest źródłem danych do symulacji różnych systemów, a nie osobna, przypadkowa odpowiedź z każdego systemu.

1. **Na potrzeby demo wyłącz stare seedowanie `EXPO_PUBLIC_SEED_PERSONA`** oraz wybór dotychczasowych person w DevPanelu. Nie trzeba kasować istniejącego store'a, jeżeli pozostaje zgodny z aplikacją.
2. W ekranie logowania najpierw umożliw wybór „Losowy profil DEMO” albo konkretnej osoby z listy (`GET /api/demo-profiles`).
3. Po kliknięciu „Zaloguj” wyślij `POST /api/demo-login` z pustym body (losowo) lub `{"profileId":"P02"}`. **To nie jest prawdziwe uwierzytelnianie.**
4. Z odpowiedzi `mobywatel` pokaż imię, nazwisko i miejscowość, jak w obecnym mocku.
5. Z odpowiedzi `appProfileV1` utwórz obecny profil aplikacji przez `ProfileSchema.parse(...)` i zapisz do istniejącego store'a. Zachowaj `profileId` jako identyfikator całej symulowanej sprawy.
6. Gdy trzeba pokazać ubezpieczenia, e-ZLA, składki, dokumenty itp., pobieraj `GET /api/demo-snapshot/{profileId}` (lub endpoint tylko danego systemu). **Nie polegaj wyłącznie na `ProfileSchema v1`, bo nie zawiera większości tych pól.**
7. Kalkulatory powinny dostać dane wejściowe z bazy, ale **same ustalać** prawo do świadczenia i wysokość. Rekord `benefit_cases` to symulowana historia, nie automat do decydowania o przyszłych uprawnieniach.
8. Dodaj na wszystkich ekranach widoczny tekst „SYMULACJA – DANE FIKCYJNE”.

Dla prawdziwego Expo web lokalnie wprowadź do `.env` np.:

```text
EXPO_PUBLIC_DEMO_API_URL=http://127.0.0.1:8765
```

Na telefonie `127.0.0.1` oznacza **telefon, nie komputer**. Tam użyj adresu IP komputera dostępnego w tej samej sieci i wystaw API na odpowiednim interfejsie (np. `python mock_server.py --host 0.0.0.0` wyłącznie w prywatnej sieci testowej). Publiczne wdrożenie wymaga dodatkowej konfiguracji, HTTPS i kontroli dostępu, szczególnie jeśli dane przestaną być fikcyjne.

Alternatywa dla hostingu statycznego: skorzystaj z `mrodzic_demo_profiles.json` jako lokalnego zestawu danych. SQLite pozostaje źródłem prawdy i eksport należy regenerować po każdej zmianie.

## Szybkie zapytania SQL

```sql
SELECT * FROM v_demo_profiles ORDER BY id;
SELECT id, label FROM v_demo_profiles WHERE random_enabled=1 ORDER BY RANDOM() LIMIT 1;
SELECT * FROM v_insurance_summary WHERE profile_id='P03';
SELECT * FROM contribution_debts WHERE person_id='P02-M';
SELECT * FROM ezla WHERE person_id='P03-M';
SELECT * FROM child_hospitalizations WHERE child_id LIKE 'P05-%';
SELECT json_extract(profile_json, '$.me.firstName') FROM app_profile_compat WHERE profile_id='P01';
```

Tabele mają klucze obce i indeksy, a wygenerowana baza przeszła `PRAGMA integrity_check` oraz `PRAGMA foreign_key_check`.

## Granice rozwiązania i bezpieczeństwo

- Żadna z historii składek, płatności, sald ani decyzji nie pochodzi od prawdziwych osób ani instytucji.
- Nie generujemy rzeczywistych numerów PESEL/NIP. W zwracanym `mobywatel` przykładowe identyfikatory dzieci są ewidentnie fikcyjne (`000...`) i służą tylko zachowaniu obecnego kontraktu TypeScript.
- Dane źródłowe są kompletne **na potrzeby zdefiniowanych 10 scenariuszy**, nie stanowią rzeczywistej repliki wszystkich rejestrów ZUS ani podstawy do automatycznego wydania decyzji.
- Po wygaśnięciu snapshotu (21.11.2026) przy prezentacji w innym terminie zmień daty w generatorze i zweryfikuj spójność okresów – sama zmiana stałej `AS_OF` tego nie robi.
- Nie podłączaj wprost tej bazy i serwera jako autoryzacji w produkcji.
- Nie publikuj dokumentów konkursowych ZUS, które mają ograniczenia rozpowszechniania. W bazie znajdują się wyłącznie wymyślone dane, nazwy i referencje.

## Powiązanie z wymaganiami ZUS

Baza umożliwia symulację: mObywatela, PUE/eZUS, stanu ubezpieczenia, historii składek i podstaw wymiaru, płatników świadczeń, zadłużenia, e-ZLA, urlopów, wniosków, hospitalizacji, zaświadczenia „Za życiem”, adopcji, pieczy zastępczej oraz danych USC. Reguły prawa i kalkulatory należy zachować w aplikacji; baza dostarcza dane wejściowe i przykładową historię.

Źródła merytoryczne: *ZUS – Pełna treść zadania konkursowego 2026* (zwłaszcza s. 12–15) oraz *Poradnik dla rodziców i opiekunów dzieci ZUS 2026*. Kontrakt `ProfileSchema` i struktura mocka logowania sprawdzone na publicznym repozytorium `Hacknation-12D/mRodzic`.
