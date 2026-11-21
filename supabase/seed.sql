-- Plik generowany poleceniem npm run content:seed-sql z content/seed/*.json.
-- Uruchom po migracjach. Istniejące rekordy treści zachowują swoje wartości.
begin;
set local standard_conforming_strings = on;
insert into public.content_meta (id, version) values (1, 0) on conflict (id) do nothing;

insert into public.content_documents (id, scope, category, title, summary, body_md, timing, visible_when, requirements, links, checklist, assistant_prompts, amount_label, tags, source, needs_review, priority)
select id, scope, category, title, summary, body_md, timing, visible_when, requirements, links, checklist, assistant_prompts, amount_label, tags, source, needs_review, priority
from jsonb_populate_recordset(null::public.content_documents, '[
  {
    "id": "aktywny-rodzic",
    "scope": "child",
    "category": "benefit",
    "title": "Aktywny rodzic",
    "summary": "Program wsparcia rodziców małych dzieci w trzech wariantach: aktywni rodzice w pracy, aktywnie w żłobku i aktywnie w domu.",
    "body_md": "## Co to jest\nProgram „Aktywny rodzic” to trzy świadczenia – rodzina wybiera jedno z nich dla danego dziecka:\n\n- **Aktywni rodzice w pracy** (tzw. „babciowe”) – **1500 zł/mies.**, a przy dziecku z niepełnosprawnością **1900 zł/mies.** Dla rodziców, którzy pracują i odprowadzają składki.\n- **Aktywnie w żłobku** – dofinansowanie opłaty za żłobek, klub dziecięcy lub dziennego opiekuna.\n- **Aktywnie w domu** – dla rodziców, którzy opiekują się dzieckiem w domu.\n\n## Kto może złożyć wniosek\nRodzic dziecka w wieku żłobkowym. TODO: uzupełnić po weryfikacji – dokładny przedział wieku dziecka, kwoty wariantów „w żłobku” i „w domu” oraz warunki dotyczące wysokości dochodu z pracy.\n\n## Jak złożyć\nWniosek składa się elektronicznie do ZUS – przez PUE ZUS, mObywatela, bankowość elektroniczną albo portal Emp@tia.\n\n## Ważne\nW danym miesiącu na jedno dziecko przysługuje tylko jeden wariant. Wybór wariantu warto przemyśleć przed zapisem do żłobka.",
    "timing": {
      "showFrom": 300,
      "showTo": 1095
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek w eZUS",
        "url": "https://www.zus.pl/ezus/logowanie",
        "kind": "apply"
      },
      {
        "label": "Program na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      },
      {
        "label": "Aktywni rodzice w pracy – instrukcja ZUS (PDF)",
        "url": "https://www.zus.pl/documents/10182/12225863/Wniosek%2Bo%2B%C5%9Bwiadczenie%2Baktywni%2Brodzice%2Bw%2Bpracy%2B-%2Binstrukcja.pdf/9da74d97-f81a-de61-7894-bb2aff68e28e",
        "kind": "guide",
        "pdfFile": "AWP.pdf"
      },
      {
        "label": "Aktywnie w żłobku – instrukcja ZUS (PDF)",
        "url": "https://www.zus.pl/documents/10182/12225863/Wniosek%2Bo%2B%C5%9Bwiadczenie%2Baktywnie%2Bw%2B%C5%BC%C5%82obku%2B%28AwZ%29%2B-%2Binstrukcja.pdf/6f42dc3b-4166-1d2e-5e89-9b416316b9a3?t=1727765056307",
        "kind": "guide",
        "pdfFile": "AWZ.pdf"
      },
      {
        "label": "Aktywnie w domu – instrukcja ZUS (PDF)",
        "url": "https://www.zus.pl/documents/10182/12225863/Wniosek%2Bo%2B%C5%9Bwiadczenie%2Baktywnie%2Bw%2Bdomu%2B%28AwD%29-%2Binstrukcja.pdf/bd08c41b-5f31-042f-c4c7-8317fdfa6891?t=1727765055999",
        "kind": "guide",
        "pdfFile": "AWD.pdf"
      }
    ],
    "checklist": [
      "Numer PESEL dziecka i rodziców",
      "Dostęp do PUE ZUS, mObywatela lub bankowości elektronicznej",
      "Dla wariantu „w żłobku”: dane placówki i umowa"
    ],
    "assistant_prompts": [
      "Który wariant programu Aktywny rodzic wybrać?",
      "Czy przy umowie zlecenie dostanę babciowe?",
      "Jak złożyć wniosek o Aktywnego rodzica w ZUS?"
    ],
    "amount_label": "1500 zł/mies. (1900 zł przy niepełnosprawności) – wariant „w pracy”",
    "tags": [
      "babciowe",
      "zlobek",
      "zus",
      "aktywni rodzice",
      "aktywny rodzic",
      "swiadczenie"
    ],
    "source": {
      "name": "ZUS / gov.pl – program Aktywny rodzic",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 4
  },
  {
    "id": "becikowe",
    "scope": "child",
    "category": "benefit",
    "title": "Becikowe",
    "summary": "Jednorazowa zapomoga z tytułu urodzenia dziecka – 1000 zł na dziecko, przy spełnieniu kryterium dochodowego.",
    "body_md": "## Co to jest\nJednorazowa zapomoga z tytułu urodzenia się dziecka (tzw. becikowe) – **1000 zł** na każde dziecko.\n\n## Kto może dostać\n- dochód netto na osobę w rodzinie nie przekracza **1922 zł**,\n- matka pozostawała pod opieką medyczną **najpóźniej od 10. tygodnia ciąży do porodu** (potrzebne zaświadczenie od lekarza lub położnej).\n\n## Termin\nWniosek trzeba złożyć **w ciągu 12 miesięcy od urodzenia dziecka**.\n\n## Jak złożyć\nW urzędzie gminy / ośrodku pomocy społecznej właściwym dla miejsca zamieszkania albo elektronicznie (np. przez portal Emp@tia).\n\n## Dokumenty\nZaświadczenie o opiece medycznej w ciąży, dokumenty potwierdzające dochód rodziny. TODO: uzupełnić po weryfikacji – pełna lista dokumentów i rok bazowy dochodu.",
    "timing": {
      "showFrom": -60,
      "deadline": 365,
      "deadlineNote": "12 miesięcy od urodzenia dziecka"
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      },
      {
        "id": "kryterium-dochodowe",
        "label": "Dochód netto na osobę do 1922 zł",
        "who": "household",
        "rule": {
          "fact": "household.incomePerPersonNet",
          "op": "lte",
          "value": 1922
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek przez Emp@tię",
        "url": "https://empatia.mrips.gov.pl",
        "kind": "apply"
      },
      {
        "label": "Informacje na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      }
    ],
    "checklist": [
      "Zaświadczenie o opiece medycznej od 10. tygodnia ciąży",
      "Akt urodzenia / PESEL dziecka",
      "Dokumenty o dochodach rodziny"
    ],
    "assistant_prompts": [
      "Czy przysługuje mi becikowe przy moim dochodzie?",
      "Skąd wziąć zaświadczenie o opiece od 10. tygodnia ciąży?",
      "Do kiedy mogę złożyć wniosek o becikowe?"
    ],
    "amount_label": "1000 zł jednorazowo",
    "tags": [
      "becikowe",
      "zapomoga",
      "urodzenie",
      "gmina",
      "kryterium dochodowe"
    ],
    "source": {
      "name": "gov.pl – jednorazowa zapomoga z tytułu urodzenia dziecka",
      "url": "https://www.gov.pl/web/rodzina",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 4
  },
  {
    "id": "dodatek-z-tytulu-urodzenia",
    "scope": "child",
    "category": "benefit",
    "title": "Dodatek z tytułu urodzenia dziecka",
    "summary": "Jednorazowy dodatek do zasiłku rodzinnego – dla rodzin, które mają prawo do zasiłku rodzinnego.",
    "body_md": "## Co to jest\nDodatek z tytułu urodzenia dziecka to jednorazowe świadczenie wypłacane **razem z zasiłkiem rodzinnym**. To coś innego niż becikowe – przy spełnieniu warunków można dostać oba.\n\n## Kto może dostać\nRodzina, która ma prawo do zasiłku rodzinnego (kryterium dochodowe). TODO: uzupełnić po weryfikacji – aktualna kwota dodatku, próg dochodowy zasiłku rodzinnego i termin złożenia wniosku.\n\n## Jak złożyć\nW urzędzie gminy / ośrodku pomocy społecznej albo elektronicznie przez Emp@tię.",
    "timing": {
      "showFrom": 0,
      "showTo": 365
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek przez Emp@tię",
        "url": "https://empatia.mrips.gov.pl",
        "kind": "apply"
      },
      {
        "label": "Świadczenia rodzinne na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      }
    ],
    "checklist": [
      "Wniosek o zasiłek rodzinny (lub decyzja o jego przyznaniu)",
      "Akt urodzenia / PESEL dziecka"
    ],
    "assistant_prompts": [
      "Czym różni się dodatek z tytułu urodzenia od becikowego?",
      "Czy mam prawo do zasiłku rodzinnego?"
    ],
    "amount_label": null,
    "tags": [
      "dodatek",
      "zasilek rodzinny",
      "urodzenie",
      "gmina"
    ],
    "source": {
      "name": "gov.pl – świadczenia rodzinne",
      "url": "https://www.gov.pl/web/rodzina",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 2
  },
  {
    "id": "dodatkowy-urlop-wczesniak",
    "scope": "child",
    "category": "work",
    "title": "Dodatkowy urlop macierzyński dla rodziców wcześniaka",
    "summary": "Dodatkowy urlop macierzyński dla rodziców wcześniaków i dzieci hospitalizowanych po porodzie – do 8 lub do 15 tygodni.",
    "body_md": "## Co to jest\nOd **19.03.2025** rodzice dzieci urodzonych przedwcześnie oraz dzieci wymagających hospitalizacji po porodzie mogą skorzystać z **dodatkowego urlopu macierzyńskiego – do 8 albo do 15 tygodni**, w zależności od sytuacji dziecka.\n\n## Kto może skorzystać\nRodzic uprawniony do urlopu macierzyńskiego / zasiłku macierzyńskiego. TODO: uzupełnić po weryfikacji – dokładne warunki (tydzień urodzenia, masa urodzeniowa, długość hospitalizacji) dla wariantu 8 i 15 tygodni.\n\n## Jak złożyć\nWniosek składa się do pracodawcy (osoby na etacie) lub do ZUS (np. prowadzący działalność). Potrzebne będą dokumenty ze szpitala.",
    "timing": {
      "showFrom": 0,
      "showTo": 180
    },
    "visible_when": {
      "fact": "child.premature",
      "op": "eq",
      "value": true
    },
    "requirements": [
      {
        "id": "wczesniak",
        "label": "Dziecko urodzone przedwcześnie lub hospitalizowane",
        "who": "child",
        "rule": {
          "fact": "child.premature",
          "op": "eq",
          "value": true
        }
      },
      {
        "id": "ubezpieczenie-chorobowe",
        "label": "Rodzic z ubezpieczeniem chorobowym (etat; JDG / zlecenie – dobrowolne)",
        "who": "anyParent",
        "rule": {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "employment_contract",
            "self_employed",
            "civil_contract"
          ]
        }
      }
    ],
    "links": [
      {
        "label": "Informacje w ZUS",
        "url": "https://www.zus.pl",
        "kind": "info"
      },
      {
        "label": "Prawa rodziców na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "guide"
      },
      {
        "label": "ZAM – wniosek o zasiłek macierzyński (PDF)",
        "url": "https://www.zus.pl/documents/10182/4223950/ZAM_wypelnij_i_wydrukuj.pdf/4e4534c6-e7cd-b934-9c5e-aab4d64f3f20?t=1793008198611",
        "kind": "guide",
        "pdfFile": "ZAM.pdf"
      }
    ],
    "checklist": [
      "Karta informacyjna / zaświadczenie ze szpitala",
      "Wniosek do pracodawcy lub ZUS"
    ],
    "assistant_prompts": [
      "Czy przysługuje mi dodatkowy urlop dla rodziców wcześniaka?",
      "Ile tygodni dodatkowego urlopu dostanę?"
    ],
    "amount_label": "do 8 lub 15 tygodni urlopu",
    "tags": [
      "wczesniak",
      "urlop",
      "macierzynski",
      "hospitalizacja",
      "szpital"
    ],
    "source": {
      "name": "ZUS – dodatkowy urlop macierzyński (od 19.03.2025)",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 5
  },
  {
    "id": "karta-duzej-rodziny",
    "scope": "household",
    "category": "benefit",
    "title": "Karta Dużej Rodziny",
    "summary": "Karta zniżek dla rodzin z co najmniej trojgiem dzieci – w wersji plastikowej i w mObywatelu.",
    "body_md": "## Co to jest\nKarta Dużej Rodziny (KDR) daje zniżki i ulgi u partnerów programu – instytucji publicznych i firm. Karta ma wersję tradycyjną i elektroniczną (w aplikacji mObywatel).\n\n## Kto może dostać\nRodzina wielodzietna – rodzic (lub małżonek rodzica) mający na utrzymaniu **co najmniej troje dzieci**. Kartę dostaje każdy członek rodziny. TODO: uzupełnić po weryfikacji – limity wieku dzieci (nauka, niepełnosprawność) i zasady dla rodziców.\n\n## Jak złożyć\nW urzędzie gminy właściwym dla miejsca zamieszkania albo elektronicznie (Emp@tia / gov.pl).",
    "timing": {
      "showFrom": -200
    },
    "visible_when": {
      "fact": "household.childrenCount",
      "op": "gte",
      "value": 3
    },
    "requirements": [
      {
        "id": "troje-dzieci",
        "label": "Co najmniej troje dzieci (już urodzonych)",
        "who": "household",
        "rule": {
          "fact": "household.childrenUnder18Count",
          "op": "gte",
          "value": 3
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek przez Emp@tię",
        "url": "https://empatia.mrips.gov.pl",
        "kind": "apply"
      },
      {
        "label": "Karta Dużej Rodziny na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      },
      {
        "label": "mObywatel",
        "url": "https://www.gov.pl/web/mobywatel",
        "kind": "guide"
      }
    ],
    "checklist": [
      "Numery PESEL członków rodziny",
      "Dokument tożsamości",
      "Zdjęcia do kart tradycyjnych (jeśli chcesz plastikowe)"
    ],
    "assistant_prompts": [
      "Jakie dokumenty są potrzebne do Karty Dużej Rodziny?",
      "Czy mogę złożyć wniosek o KDR przed porodem trzeciego dziecka?"
    ],
    "amount_label": null,
    "tags": [
      "kdr",
      "karta duzej rodziny",
      "wielodzietna",
      "znizki",
      "troje dzieci"
    ],
    "source": {
      "name": "gov.pl – Karta Dużej Rodziny",
      "url": "https://www.gov.pl/web/rodzina",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 3
  },
  {
    "id": "rekrutacja-przedszkole",
    "scope": "child",
    "category": "education",
    "title": "Rekrutacja do przedszkola",
    "summary": "Zapisy do publicznego przedszkola odbywają się zwykle raz w roku, wiosną – terminy ustala gmina.",
    "body_md": "## Co to jest\nRekrutacja do publicznych przedszkoli i oddziałów przedszkolnych. Prowadzi ją gmina – często przez internetowy system zapisów.\n\n## Kiedy\nZwykle wiosną, na rok szkolny zaczynający się we wrześniu. **Terminy ustala gmina** – sprawdź stronę urzędu lub wydziału edukacji. TODO: uzupełnić po weryfikacji – od jakiego wieku dziecko ma prawo do miejsca w przedszkolu.\n\n## Jak się przygotować\n- sprawdź listę przedszkoli w okolicy i dni otwarte,\n- przygotuj dokumenty potwierdzające kryteria (np. wielodzietność, zatrudnienie rodziców),\n- zapisz się w terminie – po rekrutacji zostaje zwykle tylko postępowanie uzupełniające.",
    "timing": {
      "showFrom": 820,
      "showTo": 2190
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Edukacja na gov.pl",
        "url": "https://www.gov.pl/web/edukacja",
        "kind": "info"
      }
    ],
    "checklist": [
      "Lista wybranych przedszkoli (zwykle kilka preferencji)",
      "Oświadczenia o spełnianiu kryteriów",
      "Numer PESEL dziecka"
    ],
    "assistant_prompts": [
      "Kiedy jest rekrutacja do przedszkola w mojej gminie?",
      "Jakie kryteria liczą się przy zapisach do przedszkola?"
    ],
    "amount_label": null,
    "tags": [
      "przedszkole",
      "rekrutacja",
      "zapisy",
      "edukacja"
    ],
    "source": {
      "name": "gov.pl – edukacja przedszkolna",
      "url": "https://www.gov.pl/web/edukacja",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 3
  },
  {
    "id": "rodzina-800-plus",
    "scope": "child",
    "category": "benefit",
    "title": "Rodzina 800+",
    "summary": "800 zł miesięcznie na każde dziecko, bez kryterium dochodowego. Wniosek w ciągu 3 miesięcy od urodzenia daje wyrównanie od miesiąca urodzenia.",
    "body_md": "## Co to jest\nŚwiadczenie wychowawcze **800 zł miesięcznie** na każde dziecko do ukończenia 18 lat. **Bez kryterium dochodowego.**\n\n## Termin\nJeśli złożysz wniosek **w ciągu 3 miesięcy od urodzenia dziecka**, dostaniesz świadczenie z wyrównaniem **od miesiąca urodzenia**. Później – od miesiąca złożenia wniosku.\n\n## Jak złożyć\nWyłącznie elektronicznie do ZUS:\n- PUE ZUS (eZUS),\n- aplikacja mObywatel,\n- bankowość elektroniczna,\n- portal Emp@tia.\n\n## Co przygotować\nPESEL dziecka (nadawany przy rejestracji urodzenia) i numer rachunku bankowego.",
    "timing": {
      "showFrom": -14,
      "deadline": 90,
      "deadlineNote": "żeby dostać wyrównanie od miesiąca urodzenia"
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie i ma PESEL",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek w eZUS",
        "url": "https://www.zus.pl/ezus/logowanie",
        "kind": "apply"
      },
      {
        "label": "Złóż wniosek w mObywatelu",
        "url": "https://www.gov.pl/web/mobywatel",
        "kind": "apply"
      },
      {
        "label": "Emp@tia – informacje",
        "url": "https://empatia.mrips.gov.pl",
        "kind": "info"
      },
      {
        "label": "SW-R – instrukcja kreatora w eZUS",
        "url": "https://www.zus.pl/portal/pomoc/kub0024.html",
        "kind": "guide"
      }
    ],
    "checklist": [
      "PESEL dziecka",
      "Numer rachunku bankowego",
      "Dostęp do PUE ZUS / mObywatela / banku"
    ],
    "assistant_prompts": [
      "Jak złożyć wniosek o 800+ dla noworodka?",
      "Co jeśli złożę wniosek o 800+ po 3 miesiącach?",
      "Gdzie sprawdzę status wniosku o 800+?"
    ],
    "amount_label": "800 zł/mies.",
    "tags": [
      "800",
      "800+",
      "800 plus",
      "swiadczenie wychowawcze",
      "zus",
      "rodzina"
    ],
    "source": {
      "name": "ZUS – Rodzina 800+",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 5
  },
  {
    "id": "swiadczenie-rodzicielskie",
    "scope": "child",
    "category": "benefit",
    "title": "Świadczenie rodzicielskie („kosiniakowe”)",
    "summary": "1000 zł netto miesięcznie dla rodziców, którzy nie mają prawa do zasiłku macierzyńskiego – np. bez pracy, studentów, przy umowie o dzieło.",
    "body_md": "## Co to jest\nŚwiadczenie rodzicielskie (tzw. kosiniakowe) – **1000 zł netto miesięcznie** dla rodziców, którzy **nie mają prawa do zasiłku macierzyńskiego**.\n\n## Kto może dostać\nNp. osoby bezrobotne, studenci, osoby pracujące na umowie o dzieło lub na zleceniu bez ubezpieczenia chorobowego. Bez kryterium dochodowego. TODO: uzupełnić po weryfikacji – okres wypłaty (w tym przy ciąży mnogiej) i termin złożenia wniosku z wyrównaniem.\n\n## Jak złożyć\nW urzędzie gminy / ośrodku pomocy społecznej albo elektronicznie przez Emp@tię.",
    "timing": {
      "showFrom": -30,
      "showTo": 365
    },
    "visible_when": {
      "any": [
        {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "unemployed",
            "student",
            "civil_contract",
            "other"
          ]
        },
        {
          "fact": "anyParent.employment",
          "op": "notExists"
        }
      ]
    },
    "requirements": [
      {
        "id": "brak-zasilku-macierzynskiego",
        "label": "Brak prawa do zasiłku macierzyńskiego (np. bez pracy, student/ka)",
        "who": "me",
        "rule": {
          "fact": "me.employment",
          "op": "in",
          "value": [
            "unemployed",
            "student"
          ]
        }
      },
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Złóż wniosek przez Emp@tię",
        "url": "https://empatia.mrips.gov.pl",
        "kind": "apply"
      },
      {
        "label": "Świadczenia rodzinne na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      }
    ],
    "checklist": [
      "Akt urodzenia / PESEL dziecka",
      "Dokument tożsamości",
      "Numer rachunku bankowego"
    ],
    "assistant_prompts": [
      "Czy przy umowie zlecenie dostanę świadczenie rodzicielskie?",
      "Czym różni się kosiniakowe od zasiłku macierzyńskiego?"
    ],
    "amount_label": "1000 zł netto/mies.",
    "tags": [
      "kosiniakowe",
      "swiadczenie rodzicielskie",
      "bez pracy",
      "student",
      "umowa o dzielo"
    ],
    "source": {
      "name": "gov.pl – świadczenie rodzicielskie",
      "url": "https://www.gov.pl/web/rodzina",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 4
  },
  {
    "id": "ubezpieczenie-zdrowotne-dziecka",
    "scope": "child",
    "category": "health",
    "title": "Zgłoszenie dziecka do ubezpieczenia zdrowotnego",
    "summary": "Dziecko trzeba zgłosić do ubezpieczenia zdrowotnego rodzica – przez pracodawcę, w ZUS lub KRUS.",
    "body_md": "## Co to jest\nZgłoszenie dziecka jako członka rodziny do ubezpieczenia zdrowotnego rodzica (NFZ). Dzięki temu dziecko ma potwierdzone prawo do świadczeń.\n\n## Kto zgłasza\n- **pracownik** – przekazuje dane dziecka pracodawcy, który zgłasza je w ZUS,\n- **przedsiębiorca (JDG)** – zgłasza dziecko samodzielnie (np. przez PUE ZUS),\n- inne sytuacje – płatnik składek rodzica (np. urząd pracy).\n\nTODO: uzupełnić po weryfikacji – termin na zgłoszenie i formularz ZUS.\n\n## Wskazówka\nPo nadaniu PESEL zrób to od razu – unikniesz problemów przy pierwszych wizytach u pediatry.",
    "timing": {
      "showFrom": 0,
      "showTo": 90
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie i ma PESEL",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      },
      {
        "id": "rodzic-ubezpieczony",
        "label": "Co najmniej jeden rodzic jest ubezpieczony (praca, JDG, zlecenie)",
        "who": "anyParent",
        "rule": {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "employment_contract",
            "self_employed",
            "civil_contract"
          ]
        }
      }
    ],
    "links": [
      {
        "label": "PUE ZUS",
        "url": "https://www.zus.pl",
        "kind": "apply"
      },
      {
        "label": "Ubezpieczenie zdrowotne – NFZ",
        "url": "https://www.nfz.gov.pl",
        "kind": "info"
      },
      {
        "label": "ZCNA – zgłoszenie członka rodziny (PDF)",
        "url": "https://bip.zus.pl/documents/10182/18428/2384_20%2BZCNA__WCAG_do%2Bzapisu.pdf/aaae2bde-9065-d64d-01cf-250841193f28?t=1779184759043",
        "kind": "guide",
        "pdfFile": "ZCNA.pdf"
      }
    ],
    "checklist": [
      "PESEL dziecka",
      "Dane rodzica ubezpieczonego"
    ],
    "assistant_prompts": [
      "Jak zgłosić dziecko do ubezpieczenia, jeśli prowadzę JDG?",
      "Kto zgłasza dziecko do NFZ, gdy oboje pracujemy?"
    ],
    "amount_label": null,
    "tags": [
      "ubezpieczenie",
      "nfz",
      "zus",
      "zdrowie",
      "zgloszenie"
    ],
    "source": {
      "name": "NFZ / ZUS – zgłoszenie członka rodziny",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 4
  },
  {
    "id": "urlop-macierzynski",
    "scope": "child",
    "category": "work",
    "title": "Urlop i zasiłek macierzyński",
    "summary": "20 tygodni urlopu macierzyńskiego przy urodzeniu jednego dziecka, dłużej przy ciąży mnogiej. Zasiłek wypłaca ZUS lub pracodawca.",
    "body_md": "## Co to jest\nUrlop macierzyński trwa **20 tygodni** przy urodzeniu jednego dziecka – **dłużej przy ciąży mnogiej**. W tym czasie przysługuje zasiłek macierzyński.\n\n## Kto może skorzystać\nOsoby z ubezpieczeniem chorobowym: pracownicy na etacie oraz – jeśli opłacają dobrowolne ubezpieczenie chorobowe – prowadzący działalność i zleceniobiorcy. Osoby bez tego ubezpieczenia mogą mieć prawo do świadczenia rodzicielskiego.\n\n## Jak złożyć\n- **etat** – wniosek do pracodawcy,\n- **JDG / zlecenie** – wniosek do ZUS (np. przez PUE ZUS).\n\nZłożenie w ciągu 21 dni od porodu wniosku o cały urlop macierzyński i rodzicielski daje zasiłek 81,5% podstawy za cały okres – zobacz dokument „Urlop rodzicielski”.\n\nTODO: uzupełnić po weryfikacji – długość urlopu przy ciąży mnogiej i możliwość rozpoczęcia przed porodem.",
    "timing": {
      "showFrom": -84,
      "showTo": 140
    },
    "visible_when": {
      "any": [
        {
          "fact": "me.gender",
          "op": "eq",
          "value": "female"
        },
        {
          "fact": "partner.gender",
          "op": "eq",
          "value": "female"
        }
      ]
    },
    "requirements": [
      {
        "id": "ubezpieczenie-chorobowe",
        "label": "Matka ma ubezpieczenie chorobowe (etat; JDG / zlecenie – dobrowolne)",
        "who": "anyParent",
        "rule": {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "employment_contract",
            "self_employed",
            "civil_contract"
          ]
        }
      }
    ],
    "links": [
      {
        "label": "Zasiłek macierzyński – ZUS",
        "url": "https://www.zus.pl",
        "kind": "info"
      },
      {
        "label": "Prawa rodziców na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "guide"
      },
      {
        "label": "ZAM – wniosek o zasiłek macierzyński (PDF)",
        "url": "https://www.zus.pl/documents/10182/4223950/ZAM_wypelnij_i_wydrukuj.pdf/4e4534c6-e7cd-b934-9c5e-aab4d64f3f20?t=1793008198611",
        "kind": "guide",
        "pdfFile": "ZAM.pdf"
      }
    ],
    "checklist": [
      "Akt urodzenia dziecka (odpis)",
      "Wniosek o urlop do pracodawcy / ZUS",
      "Zaświadczenie lekarskie (jeśli urlop od daty przed porodem)"
    ],
    "assistant_prompts": [
      "Ile trwa urlop macierzyński przy bliźniakach?",
      "Czy przy JDG należy mi się zasiłek macierzyński?",
      "Czym różni się urlop macierzyński od rodzicielskiego?"
    ],
    "amount_label": "20 tygodni (1 dziecko)",
    "tags": [
      "macierzynski",
      "urlop",
      "zasilek",
      "zus",
      "praca",
      "etat"
    ],
    "source": {
      "name": "ZUS – zasiłek macierzyński",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 4
  },
  {
    "id": "urlop-ojcowski",
    "scope": "child",
    "category": "work",
    "title": "Urlop ojcowski",
    "summary": "2 tygodnie urlopu dla ojca – do wykorzystania do ukończenia przez dziecko 12 miesięcy.",
    "body_md": "## Co to jest\nUrlop ojcowski to **2 tygodnie** urlopu dla ojca dziecka. Można go wykorzystać **do ukończenia przez dziecko 12 miesięcy** – jednorazowo albo w dwóch częściach po tygodniu.\n\n## Kto może skorzystać\nOjciec z ubezpieczeniem chorobowym (etat; JDG / zlecenie przy dobrowolnym ubezpieczeniu). Za czas urlopu przysługuje zasiłek macierzyński.\n\n## Jak złożyć\n- **etat** – wniosek do pracodawcy (TODO: uzupełnić po weryfikacji – z jakim wyprzedzeniem),\n- **JDG / zlecenie** – wniosek do ZUS.",
    "timing": {
      "showFrom": -30,
      "deadline": 365,
      "deadlineNote": "do ukończenia przez dziecko 12 miesięcy"
    },
    "visible_when": {
      "any": [
        {
          "fact": "me.gender",
          "op": "eq",
          "value": "male"
        },
        {
          "fact": "partner.gender",
          "op": "eq",
          "value": "male"
        }
      ]
    },
    "requirements": [
      {
        "id": "ubezpieczenie-chorobowe",
        "label": "Ojciec ma ubezpieczenie chorobowe (etat; JDG / zlecenie – dobrowolne)",
        "who": "anyParent",
        "rule": {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "employment_contract",
            "self_employed",
            "civil_contract"
          ]
        }
      }
    ],
    "links": [
      {
        "label": "Zasiłek za urlop ojcowski – ZUS",
        "url": "https://www.zus.pl",
        "kind": "info"
      },
      {
        "label": "Prawa rodziców na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "guide"
      },
      {
        "label": "ZAM – wniosek o zasiłek macierzyński (PDF)",
        "url": "https://www.zus.pl/documents/10182/4223950/ZAM_wypelnij_i_wydrukuj.pdf/4e4534c6-e7cd-b934-9c5e-aab4d64f3f20?t=1793008198611",
        "kind": "guide",
        "pdfFile": "ZAM.pdf"
      }
    ],
    "checklist": [
      "Akt urodzenia dziecka (odpis)",
      "Wniosek o urlop ojcowski"
    ],
    "assistant_prompts": [
      "Kiedy najlepiej wziąć urlop ojcowski?",
      "Czy urlop ojcowski można podzielić na części?"
    ],
    "amount_label": "2 tygodnie",
    "tags": [
      "ojcowski",
      "urlop",
      "tata",
      "ojciec",
      "praca",
      "zus"
    ],
    "source": {
      "name": "ZUS / gov.pl – urlop ojcowski",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 3
  },
  {
    "id": "urlop-rodzicielski",
    "scope": "child",
    "category": "work",
    "title": "Wniosek o urlop rodzicielski (wariant 81,5%)",
    "summary": "41 tygodni urlopu rodzicielskiego (43 przy ciąży mnogiej). Wniosek o całość w ciągu 21 dni od porodu daje 81,5% podstawy za cały okres.",
    "body_md": "## Co to jest\nUrlop rodzicielski trwa **41 tygodni** (**43 tygodnie** przy ciąży mnogiej). Każdy z rodziców ma **9 tygodni nieprzenoszalnych** – nie można ich oddać drugiemu rodzicowi.\n\n## Wariant 81,5%\nJeśli **w ciągu 21 dni od porodu** złożysz wniosek o **cały** urlop macierzyński i rodzicielski, zasiłek wynosi **81,5% podstawy za cały okres**.\n\n## Jak złożyć\n- **etat** – wniosek do pracodawcy,\n- **JDG / zlecenie** – wniosek do ZUS.\n\n## Wskazówka\nUstalcie z partnerem podział urlopu jeszcze przed porodem – 21 dni mija szybko. TODO: uzupełnić po weryfikacji – wysokość zasiłku w wariancie bez wniosku w 21 dni.",
    "timing": {
      "showFrom": -56,
      "deadline": 21,
      "deadlineNote": "wniosek o cały urlop w ciągu 21 dni od porodu → 81,5% podstawy za cały okres"
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "ubezpieczenie-chorobowe",
        "label": "Rodzic z ubezpieczeniem chorobowym (etat; JDG / zlecenie – dobrowolne)",
        "who": "anyParent",
        "rule": {
          "fact": "anyParent.employment",
          "op": "in",
          "value": [
            "employment_contract",
            "self_employed",
            "civil_contract"
          ]
        }
      }
    ],
    "links": [
      {
        "label": "Zasiłek macierzyński – ZUS",
        "url": "https://www.zus.pl",
        "kind": "info"
      },
      {
        "label": "Prawa rodziców na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "guide"
      },
      {
        "label": "ZAM – wniosek o zasiłek macierzyński (PDF)",
        "url": "https://www.zus.pl/documents/10182/4223950/ZAM_wypelnij_i_wydrukuj.pdf/4e4534c6-e7cd-b934-9c5e-aab4d64f3f20?t=1793008198611",
        "kind": "guide",
        "pdfFile": "ZAM.pdf"
      }
    ],
    "checklist": [
      "Odpis aktu urodzenia",
      "Ustalony podział urlopu między rodzicami",
      "Wniosek do pracodawcy / ZUS"
    ],
    "assistant_prompts": [
      "Jak podzielić urlop rodzicielski z partnerem?",
      "Co daje złożenie wniosku w 21 dni od porodu?",
      "Ile tygodni urlopu rodzicielskiego mamy przy bliźniakach?"
    ],
    "amount_label": "81,5% podstawy (wniosek w 21 dni)",
    "tags": [
      "rodzicielski",
      "urlop",
      "81,5",
      "21 dni",
      "zasilek",
      "zus",
      "praca"
    ],
    "source": {
      "name": "ZUS – zasiłek macierzyński za urlop rodzicielski",
      "url": "https://www.zus.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 5
  },
  {
    "id": "zaswiadczenie-opieka-medyczna",
    "scope": "child",
    "category": "health",
    "title": "Zaświadczenie o opiece medycznej od 10. tygodnia ciąży",
    "summary": "Zaświadczenie od lekarza lub położnej, że byłaś pod opieką medyczną najpóźniej od 10. tygodnia ciąży – warunek becikowego.",
    "body_md": "## Po co\nTo zaświadczenie jest **warunkiem becikowego** – potwierdza, że matka pozostawała pod opieką medyczną **najpóźniej od 10. tygodnia ciąży do porodu**.\n\n## Jak zdobyć\n- zgłoś się do lekarza lub położnej **przed końcem 10. tygodnia ciąży**,\n- poproś o zaświadczenie na wizycie pod koniec ciąży (albo po porodzie) – wystawia je lekarz lub położna prowadząca.\n\nTODO: uzupełnić po weryfikacji – wzór zaświadczenia i wyjątki.",
    "timing": {
      "showFrom": -238,
      "showTo": 60,
      "deadlineNote": "pierwsza wizyta najpóźniej w 10. tygodniu ciąży"
    },
    "visible_when": null,
    "requirements": [],
    "links": [
      {
        "label": "Becikowe – informacje na gov.pl",
        "url": "https://www.gov.pl/web/rodzina",
        "kind": "info"
      },
      {
        "label": "Opieka w ciąży – NFZ",
        "url": "https://www.nfz.gov.pl",
        "kind": "guide"
      }
    ],
    "checklist": [
      "Karta ciąży / dokumentacja wizyt",
      "Dane lekarza lub położnej prowadzącej"
    ],
    "assistant_prompts": [
      "Skąd wziąć zaświadczenie o opiece od 10. tygodnia ciąży?",
      "Co jeśli pierwsza wizyta była po 10. tygodniu?"
    ],
    "amount_label": null,
    "tags": [
      "zaswiadczenie",
      "10 tydzien",
      "becikowe",
      "ciaza",
      "lekarz",
      "polozna"
    ],
    "source": {
      "name": "gov.pl – warunki jednorazowej zapomogi",
      "url": "https://www.gov.pl/web/rodzina",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 3
  },
  {
    "id": "zgloszenie-urodzenia",
    "scope": "child",
    "category": "registry",
    "title": "Zgłoszenie urodzenia i nadanie PESEL",
    "summary": "Urodzenie trzeba zgłosić w ciągu 21 dni od sporządzenia karty urodzenia – w urzędzie stanu cywilnego albo w mObywatelu. Dziecko dostaje PESEL.",
    "body_md": "## Co to jest\nRejestracja urodzenia w urzędzie stanu cywilnego (USC). Po rejestracji dziecko dostaje **akt urodzenia i numer PESEL** – bez nich nie złożysz większości wniosków (np. 800+).\n\n## Termin\n**21 dni od sporządzenia karty urodzenia** (szpital przekazuje ją do USC zwykle kilka dni po porodzie).\n\n## Jak zgłosić\n- **online** – w aplikacji mObywatel lub na gov.pl (potrzebny Profil Zaufany lub e-dowód),\n- **osobiście** – w dowolnym urzędzie stanu cywilnego.\n\nPrzy zgłoszeniu wybierasz imię (imiona) dziecka i możesz od razu zameldować dziecko.",
    "timing": {
      "showFrom": -14,
      "showTo": 60,
      "deadline": 21,
      "deadlineNote": "21 dni od sporządzenia karty urodzenia (termin orientacyjny liczony od porodu)"
    },
    "visible_when": null,
    "requirements": [
      {
        "id": "dziecko-urodzone",
        "label": "Dziecko jest już na świecie",
        "who": "child",
        "rule": {
          "fact": "child.status",
          "op": "eq",
          "value": "born"
        }
      }
    ],
    "links": [
      {
        "label": "Zgłoś w mObywatelu",
        "url": "https://www.gov.pl/web/mobywatel",
        "kind": "apply"
      },
      {
        "label": "Usługi dla rodziców na gov.pl",
        "url": "https://www.gov.pl",
        "kind": "info"
      }
    ],
    "checklist": [
      "Profil Zaufany / mObywatel",
      "Dowody osobiste rodziców",
      "Wybrane imię (imiona) dziecka"
    ],
    "assistant_prompts": [
      "Jak zgłosić urodzenie dziecka w mObywatelu?",
      "Co jeśli nie zdążę zgłosić urodzenia w 21 dni?"
    ],
    "amount_label": null,
    "tags": [
      "pesel",
      "usc",
      "urodzenie",
      "akt urodzenia",
      "mobywatel",
      "rejestracja",
      "zgloszenie"
    ],
    "source": {
      "name": "gov.pl – zgłoszenie urodzenia dziecka",
      "url": "https://www.gov.pl",
      "asOf": "2026-11"
    },
    "needs_review": true,
    "priority": 5
  }
]'::jsonb)
on conflict (id) do nothing;

insert into public.content_tips (id, title, summary_md, body_md, timing, visible_when, tags, source, priority)
select id, title, summary_md, body_md, timing, visible_when, tags, source, priority
from jsonb_populate_recordset(null::public.content_tips, '[
  {
    "id": "adaptacja-w-zlobku",
    "title": "Adaptacja w żłobku krok po kroku",
    "summary_md": "Pierwsze dni w żłobku warto rozłożyć w czasie: krótkie pobyty, ten sam rytuał pożegnania i ulubiona przytulanka z domu.",
    "body_md": "## Jak przygotować adaptację\n- zacznij od krótkich pobytów, najlepiej razem z dzieckiem,\n- wydłużaj czas stopniowo, w miarę jak dziecko się oswaja,\n- żegnaj się krótko i zawsze tak samo – i nie wychodź „po cichu”,\n- daj dziecku rzecz z domu (przytulankę, kocyk),\n- zaplanuj adaptację przed powrotem do pracy – zostaw sobie zapas czasu.\n\nPłacz przy rozstaniu w pierwszych tygodniach jest normalny. Pytaj opiekunów, jak dziecko radzi sobie po Twoim wyjściu.",
    "timing": {
      "showFrom": 300,
      "showTo": 1095
    },
    "visible_when": null,
    "tags": [
      "zlobek",
      "adaptacja",
      "powrot do pracy"
    ],
    "source": null,
    "priority": 4
  },
  {
    "id": "baby-blues",
    "title": "Baby blues czy depresja poporodowa?",
    "summary_md": "Smutek i płaczliwość w pierwszych dniach po porodzie są częste. Jeśli trwają dłużej lub się nasilają – porozmawiaj z lekarzem lub położną.",
    "body_md": "## Na co zwrócić uwagę\nGorszy nastrój, zmęczenie i płaczliwość w pierwszych dniach po porodzie zdarzają się bardzo często.\n\n**Skontaktuj się z lekarzem, położną lub psychologiem**, jeśli:\n- smutek, lęk lub poczucie beznadziei nie mijają albo się nasilają,\n- trudno Ci zajmować się sobą lub dzieckiem,\n- pojawiają się myśli o zrobieniu krzywdy sobie lub dziecku – wtedy szukaj pomocy natychmiast (numer alarmowy 112).\n\nTo dotyczy także drugiego rodzica. Proszenie o pomoc to troska o dziecko.",
    "timing": {
      "showFrom": 0,
      "showTo": 365
    },
    "visible_when": null,
    "tags": [
      "zdrowie psychiczne",
      "depresja poporodowa",
      "wsparcie"
    ],
    "source": {
      "name": "NFZ – zdrowie psychiczne",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 5
  },
  {
    "id": "bezpieczenstwo-w-domu",
    "title": "Dom bezpieczny dla raczkującego dziecka",
    "summary_md": "Gdy dziecko zaczyna się przemieszczać, zabezpiecz gniazdka, szuflady, schody i rogi mebli. Leki i chemię trzymaj wysoko i pod zamknięciem.",
    "body_md": "## Lista kontrolna\n- zaślepki do gniazdek i zabezpieczenia szuflad,\n- bramki przy schodach,\n- meble przymocowane do ściany,\n- leki, chemia i małe przedmioty poza zasięgiem,\n- kable i sznurki od rolet schowane,\n- nigdy nie zostawiaj dziecka samego w wannie.\n\nPrzejdź po domu na czworakach – zobaczysz zagrożenia z perspektywy dziecka.",
    "timing": {
      "showFrom": 150,
      "showTo": 720
    },
    "visible_when": null,
    "tags": [
      "bezpieczenstwo",
      "dom",
      "raczkowanie"
    ],
    "source": null,
    "priority": 3
  },
  {
    "id": "bilanse-zdrowia",
    "title": "Bilanse zdrowia u pediatry",
    "summary_md": "Bilanse to bezpłatne wizyty kontrolne w kluczowych momentach rozwoju dziecka. Zapisuj terminy i zabieraj książeczkę zdrowia.",
    "body_md": "## Co to jest bilans\nBilans zdrowia to wizyta kontrolna u lekarza POZ, na której ocenia się rozwój dziecka – wzrost, wagę, rozwój ruchowy, wzrok, słuch i mowę.\n\n## Jak się przygotować\n- zabierz książeczkę zdrowia dziecka,\n- zapisz pytania i obserwacje (sen, jedzenie, rozwój),\n- umów wizytę z wyprzedzeniem.\n\nTODO: uzupełnić po weryfikacji – harmonogram bilansów wg aktualnych przepisów.",
    "timing": {
      "showFrom": 21,
      "showTo": 2190
    },
    "visible_when": null,
    "tags": [
      "bilans",
      "pediatra",
      "zdrowie",
      "poz"
    ],
    "source": {
      "name": "NFZ – opieka nad dzieckiem w POZ",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 3
  },
  {
    "id": "czytanie-i-mowa",
    "title": "Mowa rozwija się w rozmowie",
    "summary_md": "Mów do dziecka, opisuj, co robicie, czytaj krótkie książeczki i śpiewaj. Ekrany nie zastąpią rozmowy z dorosłym.",
    "body_md": "## Proste nawyki\n- komentuj codzienne czynności („Teraz zakładamy skarpetki”),\n- odpowiadaj na gaworzenie i gesty,\n- codziennie oglądajcie razem książeczkę,\n- śpiewajcie piosenki z pokazywaniem,\n- ograniczaj ekrany u najmłodszych dzieci.\n\nJeśli niepokoi Cię rozwój mowy, porozmawiaj o tym na bilansie z pediatrą.",
    "timing": {
      "showFrom": 120,
      "showTo": 1460
    },
    "visible_when": null,
    "tags": [
      "mowa",
      "czytanie",
      "rozwoj"
    ],
    "source": null,
    "priority": 2
  },
  {
    "id": "karmienie-poczatki",
    "title": "Karmienie w pierwszych tygodniach",
    "summary_md": "Początki karmienia bywają trudne. Nie zostawaj z tym sama – pomocy udziela położna i doradczynie laktacyjne.",
    "body_md": "## Dobre praktyki\n- karm na żądanie i obserwuj sygnały głodu,\n- zadbaj o wygodną pozycję – dla siebie i dziecka,\n- zapisuj karmienia i pieluchy w pierwszych dniach, jeśli to Cię uspokaja,\n- jeśli karmienie boli albo dziecko słabo przybiera na wadze – skontaktuj się z położną lub lekarzem.\n\nKarmienie mlekiem modyfikowanym to też dobra decyzja, jeśli taka jest potrzeba Twojej rodziny.",
    "timing": {
      "showFrom": -14,
      "showTo": 90
    },
    "visible_when": null,
    "tags": [
      "karmienie",
      "laktacja",
      "noworodek"
    ],
    "source": null,
    "priority": 4
  },
  {
    "id": "kolki-i-placz",
    "title": "Gdy dziecko dużo płacze",
    "summary_md": "Płacz to główny sposób komunikacji niemowlęcia. Jeśli tracisz cierpliwość – połóż dziecko bezpiecznie w łóżeczku i zrób przerwę.",
    "body_md": "## Co może pomóc\n- sprawdź podstawy: głód, pielucha, temperatura,\n- noszenie, kołysanie, szum,\n- spokojne, przyciemnione otoczenie.\n\n## Ważne\n**Nigdy nie potrząsaj dzieckiem.** Jeśli czujesz złość lub bezradność – połóż dziecko bezpiecznie w łóżeczku, wyjdź na chwilę z pokoju i poproś kogoś o pomoc.\n\nJeśli płacz jest inny niż zwykle, towarzyszy mu gorączka, wymioty lub apatia – skontaktuj się z lekarzem.",
    "timing": {
      "showFrom": 7,
      "showTo": 150
    },
    "visible_when": null,
    "tags": [
      "placz",
      "kolki",
      "niemowle"
    ],
    "source": null,
    "priority": 4
  },
  {
    "id": "pierwsza-wizyta-w-ciazy",
    "title": "Pierwsze tygodnie ciąży",
    "summary_md": "Umów pierwszą wizytę u lekarza lub położnej jak najwcześniej – opieka medyczna najpóźniej od 10. tygodnia ciąży to także warunek becikowego.",
    "body_md": "## Od czego zacząć\n- umów wizytę u ginekologa lub położnej,\n- załóż kartę ciąży i zbieraj w niej wyniki badań,\n- zapytaj o badania i suplementację zalecane na Twoim etapie,\n- zapisz datę pierwszej wizyty – przyda się do zaświadczenia o opiece od 10. tygodnia.",
    "timing": {
      "showFrom": -266,
      "showTo": -182
    },
    "visible_when": null,
    "tags": [
      "ciaza",
      "pierwsza wizyta",
      "10 tydzien",
      "becikowe"
    ],
    "source": null,
    "priority": 5
  },
  {
    "id": "pierwsze-dni-w-domu",
    "title": "Pierwsze dni w domu",
    "summary_md": "Po powrocie ze szpitala skup się na odpoczynku, karmieniu i bliskości. Formalności rozłóż w czasie – ale pamiętaj o 21 dniach na zgłoszenie urodzenia.",
    "body_md": "## Priorytety\n1. Odpoczynek i jedzenie – przyjmij każdą pomoc.\n2. Karmienie i sen dziecka.\n3. Formalności: zgłoszenie urodzenia (21 dni od sporządzenia karty urodzenia), potem 800+ i ubezpieczenie dziecka.\n\nZajrzyj do zakładki **Dokumenty** – terminy są tam ułożone po kolei.",
    "timing": {
      "showFrom": 0,
      "showTo": 21
    },
    "visible_when": null,
    "tags": [
      "noworodek",
      "dom",
      "formalnosci"
    ],
    "source": null,
    "priority": 5
  },
  {
    "id": "plan-porodu",
    "title": "Plan porodu i wybór szpitala",
    "summary_md": "Zastanów się, gdzie chcesz rodzić, i spisz swoje preferencje w planie porodu. Sprawdź, jak dojechać do szpitala o każdej porze.",
    "body_md": "## Co przemyśleć\n- wybór szpitala (opinie, oddział neonatologiczny, możliwość porodu rodzinnego),\n- znieczulenie i metody łagodzenia bólu,\n- kontakt „skóra do skóry” i karmienie po porodzie,\n- kto będzie osobą towarzyszącą.\n\nPlan porodu omów z lekarzem lub położną. To zbiór preferencji, nie umowa – w razie potrzeby personel może zmienić plan.",
    "timing": {
      "showFrom": -112,
      "showTo": -21
    },
    "visible_when": null,
    "tags": [
      "porod",
      "szpital",
      "plan porodu"
    ],
    "source": null,
    "priority": 4
  },
  {
    "id": "przygotowanie-do-przedszkola",
    "title": "Przygotowanie do przedszkola",
    "summary_md": "Kilka miesięcy przed przedszkolem ćwiczcie samodzielność: jedzenie, mycie rąk, sygnalizowanie potrzeb, ubieranie się.",
    "body_md": "## Co ćwiczyć\n- samodzielne jedzenie i picie z kubka,\n- mycie rąk i korzystanie z toalety (lub sygnalizowanie potrzeby),\n- zakładanie butów i kurtki,\n- zabawę z innymi dziećmi.\n\nOpowiadaj o przedszkolu pozytywnie, odwiedźcie je w dzień otwarty.",
    "timing": {
      "showFrom": 820,
      "showTo": 1460
    },
    "visible_when": null,
    "tags": [
      "przedszkole",
      "samodzielnosc"
    ],
    "source": null,
    "priority": 3
  },
  {
    "id": "rozszerzanie-diety",
    "title": "Rozszerzanie diety",
    "summary_md": "Moment i sposób rozszerzania diety omów z pediatrą. Nowe produkty wprowadzaj stopniowo i obserwuj reakcje dziecka.",
    "body_md": "## Zasady ogólne\n- termin rozpoczęcia ustal z pediatrą – zależy od rozwoju dziecka,\n- wprowadzaj nowe produkty pojedynczo,\n- nie dodawaj soli i cukru,\n- uważaj na produkty, którymi łatwo się zadławić.\n\nTo informacje ogólne – zalecenia dla Twojego dziecka da lekarz.",
    "timing": {
      "showFrom": 120,
      "showTo": 365
    },
    "visible_when": null,
    "tags": [
      "dieta",
      "jedzenie",
      "niemowle"
    ],
    "source": null,
    "priority": 3
  },
  {
    "id": "sen-niemowlecia",
    "title": "Bezpieczny sen niemowlęcia",
    "summary_md": "Układaj dziecko do snu na plecach, na twardym materacu, bez poduszek, kołder i maskotek w łóżeczku.",
    "body_md": "## Bezpieczny sen\n- zawsze na plecach,\n- twardy, płaski materac,\n- bez poduszki, kołdry, ochraniaczy i pluszaków w łóżeczku – zamiast kołdry śpiworek,\n- nie przegrzewaj pomieszczenia,\n- dym tytoniowy z daleka od dziecka.\n\nRytm snu noworodka jest nieregularny – to normalne. Śpij, kiedy dziecko śpi.",
    "timing": {
      "showFrom": -28,
      "showTo": 365
    },
    "visible_when": null,
    "tags": [
      "sen",
      "bezpieczenstwo",
      "noworodek"
    ],
    "source": null,
    "priority": 5
  },
  {
    "id": "torba-do-szpitala",
    "title": "Torba do szpitala",
    "summary_md": "Spakuj torbę kilka tygodni przed terminem: dokumenty, karta ciąży, rzeczy dla siebie i dla dziecka, fotelik do samochodu.",
    "body_md": "## Lista\n**Dokumenty:** dowód osobisty, karta ciąży, wyniki badań, plan porodu.\n\n**Dla Ciebie:** koszula, szlafrok, klapki, podpaski poporodowe, wkładki laktacyjne, kosmetyki, ładowarka.\n\n**Dla dziecka:** ubranka na wyjście, czapeczka, pieluchy, kocyk, fotelik samochodowy.\n\nSprawdź w szpitalu, co zapewniają na miejscu.",
    "timing": {
      "showFrom": -56,
      "showTo": 0
    },
    "visible_when": null,
    "tags": [
      "szpital",
      "porod",
      "torba",
      "wyprawka"
    ],
    "source": null,
    "priority": 5
  },
  {
    "id": "wizyty-patronazowe",
    "title": "Wizyty patronażowe położnej",
    "summary_md": "Po powrocie do domu odwiedzi Was położna środowiskowa – sprawdzi dziecko, pomoże w karmieniu i pielęgnacji. Wybierz ją jeszcze w ciąży.",
    "body_md": "## Jak to działa\nPołożna POZ odwiedza mamę i dziecko w domu w pierwszych tygodniach po porodzie. To dobry moment na pytania o karmienie, pępek, kąpiel i samopoczucie.\n\n## Co zrobić\n- złóż deklarację wyboru położnej POZ (najlepiej w ciąży),\n- po porodzie zgłoś jej powrót do domu.\n\nTODO: uzupełnić po weryfikacji – liczba wizyt i terminy wg NFZ.",
    "timing": {
      "showFrom": -42,
      "showTo": 42
    },
    "visible_when": null,
    "tags": [
      "polozna",
      "patronaz",
      "noworodek",
      "poz"
    ],
    "source": {
      "name": "NFZ – opieka położnej POZ",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 4
  },
  {
    "id": "wsparcie-w-iii-trymestrze",
    "title": "III trymestr – zadbaj o siebie",
    "summary_md": "Zwolnij tempo, zaplanuj formalności z wyprzedzeniem i ustal z partnerem podział urlopów – po porodzie zostanie mniej czasu.",
    "body_md": "## Do przemyślenia\n- kto zajmie się formalnościami po porodzie (zgłoszenie urodzenia, 800+, ubezpieczenie),\n- jak podzielicie urlop rodzicielski (wniosek w 21 dni od porodu daje 81,5%),\n- kto pomoże Wam w pierwszych tygodniach.\n\nW zakładce **Dokumenty** zobaczysz, co Cię czeka i kiedy.",
    "timing": {
      "showFrom": -91,
      "showTo": -7
    },
    "visible_when": null,
    "tags": [
      "ciaza",
      "trzeci trymestr",
      "planowanie"
    ],
    "source": null,
    "priority": 3
  }
]'::jsonb)
on conflict (id) do nothing;

insert into public.content_todos (id, title, description_md, timing, visible_when, category, related_document_id, source, priority)
select id, title, description_md, timing, visible_when, category, related_document_id, source, priority
from jsonb_populate_recordset(null::public.content_todos, '[
  {
    "id": "deklaracja-polozna-poz",
    "title": "Wybierz położną POZ",
    "description_md": "Złóż deklarację wyboru położnej podstawowej opieki zdrowotnej – będzie odwiedzać Was w domu po porodzie.",
    "timing": {
      "showFrom": -98,
      "showTo": -7
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": {
      "name": "NFZ",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 4
  },
  {
    "id": "dni-otwarte-przedszkole",
    "title": "Odwiedź przedszkola w dni otwarte",
    "description_md": "Przed rekrutacją zobacz kilka przedszkoli w okolicy i wybierz swoje preferencje.",
    "timing": {
      "showFrom": 820,
      "showTo": 1300
    },
    "visible_when": null,
    "category": "education",
    "related_document_id": "rekrutacja-przedszkole",
    "source": null,
    "priority": 3
  },
  {
    "id": "edukacja-przedporodowa",
    "title": "Zapisz się na edukację przedporodową",
    "description_md": "Zajęcia w szkole rodzenia lub u położnej POZ przygotowują do porodu, karmienia i opieki nad noworodkiem. TODO: uzupełnić po weryfikacji – zasady finansowania przez NFZ.",
    "timing": {
      "showFrom": -150,
      "showTo": -21
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": {
      "name": "NFZ",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 4
  },
  {
    "id": "fotelik-samochodowy",
    "title": "Kup i zamontuj fotelik samochodowy",
    "description_md": "Fotelik będzie potrzebny już przy wyjściu ze szpitala. Przećwicz montaż przed porodem.",
    "timing": {
      "showFrom": -84,
      "showTo": -7
    },
    "visible_when": null,
    "category": "home",
    "related_document_id": null,
    "source": null,
    "priority": 3
  },
  {
    "id": "ksiazeczka-zdrowia",
    "title": "Pilnuj książeczki zdrowia dziecka",
    "description_md": "Książeczkę zdrowia dostaniesz w szpitalu. Zabieraj ją na każdą wizytę u pediatry i na szczepienia.",
    "timing": {
      "showFrom": 0,
      "showTo": 30
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": null,
    "priority": 2
  },
  {
    "id": "plan-porodu-todo",
    "title": "Spisz plan porodu",
    "description_md": "Zapisz swoje preferencje i omów je z lekarzem lub położną.",
    "timing": {
      "showFrom": -84,
      "showTo": -14
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": null,
    "priority": 3
  },
  {
    "id": "podzial-urlopu",
    "title": "Ustalcie podział urlopu rodzicielskiego",
    "description_md": "Wniosek o cały urlop w ciągu 21 dni od porodu daje 81,5% podstawy za cały okres. Ustalcie podział przed porodem.",
    "timing": {
      "showFrom": -56,
      "showTo": 14
    },
    "visible_when": {
      "fact": "anyParent.employment",
      "op": "in",
      "value": [
        "employment_contract",
        "self_employed",
        "civil_contract"
      ]
    },
    "category": "work",
    "related_document_id": "urlop-rodzicielski",
    "source": null,
    "priority": 5
  },
  {
    "id": "poinformuj-pracodawce",
    "title": "Poinformuj pracodawcę o ciąży",
    "description_md": "Przedstaw pracodawcy zaświadczenie lekarskie o ciąży – od tego momentu przysługuje Ci szczególna ochrona. TODO: uzupełnić po weryfikacji – zakres ochrony i obowiązki pracodawcy.",
    "timing": {
      "showFrom": -238,
      "showTo": -140
    },
    "visible_when": {
      "all": [
        {
          "fact": "me.gender",
          "op": "eq",
          "value": "female"
        },
        {
          "fact": "me.employment",
          "op": "eq",
          "value": "employment_contract"
        }
      ]
    },
    "category": "work",
    "related_document_id": null,
    "source": null,
    "priority": 3
  },
  {
    "id": "profil-zaufany",
    "title": "Załóż Profil Zaufany i mObywatela",
    "description_md": "Z Profilem Zaufanym zgłosisz urodzenie i złożysz wnioski online – bez wizyt w urzędzie.",
    "timing": {
      "showFrom": -140,
      "showTo": 7
    },
    "visible_when": null,
    "category": "registry",
    "related_document_id": "zgloszenie-urodzenia",
    "source": {
      "name": "gov.pl – mObywatel",
      "url": "https://www.gov.pl/web/mobywatel",
      "asOf": "2026-11"
    },
    "priority": 4
  },
  {
    "id": "przeglad-budzetu",
    "title": "Zrób przegląd budżetu i świadczeń",
    "description_md": "Sprawdź, które świadczenia już wpływają, a o które jeszcze możesz wnioskować. Uzupełnij dochód w profilu, żeby aplikacja oceniła kryteria.",
    "timing": {
      "showFrom": 30,
      "showTo": 120
    },
    "visible_when": null,
    "category": "other",
    "related_document_id": null,
    "source": null,
    "priority": 2
  },
  {
    "id": "szczepienia-pso",
    "title": "Szczepienia według Programu Szczepień Ochronnych",
    "description_md": "Terminy szczepień ustala pediatra zgodnie z aktualnym Programem Szczepień Ochronnych (PSO), publikowanym co roku przez Głównego Inspektora Sanitarnego. Sprawdź kalendarz w oficjalnym źródle i w książeczce zdrowia.",
    "timing": {
      "showFrom": 0,
      "showTo": 730
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": {
      "name": "GIS – Program Szczepień Ochronnych",
      "url": "https://www.gov.pl/web/gis",
      "asOf": "2026-11"
    },
    "priority": 5
  },
  {
    "id": "wybor-pediatry",
    "title": "Wybierz pediatrę (lekarza POZ) dla dziecka",
    "description_md": "Złóż deklarację wyboru lekarza POZ dla dziecka – po porodzie będzie potrzebny na pierwsze wizyty i bilanse.",
    "timing": {
      "showFrom": -56,
      "showTo": 30
    },
    "visible_when": null,
    "category": "health",
    "related_document_id": null,
    "source": {
      "name": "NFZ",
      "url": "https://www.nfz.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 5
  },
  {
    "id": "wyprawka",
    "title": "Przygotuj wyprawkę",
    "description_md": "Ubranka, pieluchy, miejsce do spania, wanienka. Nie kupuj wszystkiego na zapas – wiele rzeczy można pożyczyć.",
    "timing": {
      "showFrom": -112,
      "showTo": -14
    },
    "visible_when": null,
    "category": "home",
    "related_document_id": null,
    "source": null,
    "priority": 2
  },
  {
    "id": "zapisy-do-zlobka",
    "title": "Zapisz dziecko do żłobka",
    "description_md": "W wielu miastach zapisy do żłobków publicznych trwają cały rok, a kolejki są długie. Zapisz dziecko z wyprzedzeniem i sprawdź wariant „Aktywnie w żłobku”.",
    "timing": {
      "showFrom": 90,
      "showTo": 540
    },
    "visible_when": null,
    "category": "education",
    "related_document_id": "aktywny-rodzic",
    "source": null,
    "priority": 4
  },
  {
    "id": "dokument-podrozny",
    "title": "Dokument dla dziecka przed podróżą",
    "description_md": "Jeśli planujecie wyjazd za granicę, dziecko potrzebuje własnego dokumentu podróży. Wniosek złóż z wyprzedzeniem. TODO: uzupełnić po weryfikacji – czas oczekiwania.",
    "timing": {
      "showFrom": 30,
      "showTo": 1095
    },
    "visible_when": null,
    "category": "registry",
    "related_document_id": null,
    "source": {
      "name": "gov.pl",
      "url": "https://www.gov.pl",
      "asOf": "2026-11"
    },
    "priority": 1
  }
]'::jsonb)
on conflict (id) do nothing;

insert into public.content_prompts (id, text, timing, visible_when)
select id, text, timing, visible_when
from jsonb_populate_recordset(null::public.content_prompts, '[
  {
    "id": "aktywny-rodzic-co-to",
    "text": "Co to jest program Aktywny rodzic?",
    "timing": {
      "showFrom": 240,
      "showTo": 1095
    },
    "visible_when": null
  },
  {
    "id": "becikowe-czy-mi-przysluguje",
    "text": "Czy przysługuje mi becikowe?",
    "timing": {
      "showFrom": -60,
      "showTo": 365
    },
    "visible_when": null
  },
  {
    "id": "bilanse-zdrowia",
    "text": "Jakie są bilanse zdrowia dziecka?",
    "timing": {
      "showFrom": 0,
      "showTo": 2190
    },
    "visible_when": null
  },
  {
    "id": "kdr-dokumenty",
    "text": "Jakie dokumenty są potrzebne do Karty Dużej Rodziny?",
    "timing": {
      "showFrom": -200
    },
    "visible_when": {
      "fact": "household.childrenCount",
      "op": "gte",
      "value": 3
    }
  },
  {
    "id": "kosiniakowe-co-to",
    "text": "Czym jest świadczenie rodzicielskie (kosiniakowe)?",
    "timing": {
      "showFrom": -60,
      "showTo": 365
    },
    "visible_when": {
      "fact": "anyParent.employment",
      "op": "in",
      "value": [
        "unemployed",
        "student",
        "civil_contract",
        "other"
      ]
    }
  },
  {
    "id": "macierzynski-vs-rodzicielski",
    "text": "Czym różni się urlop macierzyński od rodzicielskiego?",
    "timing": {
      "showFrom": -140,
      "showTo": 180
    },
    "visible_when": null
  },
  {
    "id": "ojcowski-kiedy",
    "text": "Kiedy wziąć urlop ojcowski?",
    "timing": {
      "showFrom": -30,
      "showTo": 365
    },
    "visible_when": null
  },
  {
    "id": "przedszkole-rekrutacja",
    "text": "Kiedy jest rekrutacja do przedszkola?",
    "timing": {
      "showFrom": 820,
      "showTo": 2190
    },
    "visible_when": null
  },
  {
    "id": "rodzicielski-podzial",
    "text": "Jak podzielić urlop rodzicielski z partnerem?",
    "timing": {
      "showFrom": -84,
      "showTo": 300
    },
    "visible_when": null
  },
  {
    "id": "swiadczenia-w-ciazy",
    "text": "Jakie świadczenia i formalności czekają mnie w ciąży?",
    "timing": {
      "showFrom": -280,
      "showTo": -1
    },
    "visible_when": null
  },
  {
    "id": "torba-szpital",
    "text": "Co spakować do torby do szpitala?",
    "timing": {
      "showFrom": -70,
      "showTo": 0
    },
    "visible_when": null
  },
  {
    "id": "wczesniak-urlop",
    "text": "Czy przysługuje mi dodatkowy urlop dla rodziców wcześniaka?",
    "timing": {
      "showFrom": 0,
      "showTo": 180
    },
    "visible_when": {
      "fact": "child.premature",
      "op": "eq",
      "value": true
    }
  },
  {
    "id": "wniosek-800",
    "text": "Jak złożyć wniosek o 800+?",
    "timing": {
      "showFrom": -14,
      "showTo": 365
    },
    "visible_when": null
  },
  {
    "id": "zglosic-urodzenie",
    "text": "Jak zgłosić urodzenie dziecka w mObywatelu?",
    "timing": {
      "showFrom": -30,
      "showTo": 60
    },
    "visible_when": null
  },
  {
    "id": "zlobek-przygotowanie",
    "text": "Jak przygotować dziecko do żłobka?",
    "timing": {
      "showFrom": 240,
      "showTo": 1095
    },
    "visible_when": null
  }
]'::jsonb)
on conflict (id) do nothing;
commit;
