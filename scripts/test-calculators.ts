/**
 * npm run calc
 * Interaktywne CLI do ręcznego testowania kalkulatorów zasiłków (src/core/benefits).
 * Pod każdym pytaniem wyświetla się opis pola: co wpisać, gdzie znaleźć wartość i jak wpływa na wynik.
 * Enter przy pytaniu = wartość domyślna (przykładowe dane), więc można „przeklikać” każdy kalkulator.
 *
 * Tryb bez pytań (np. do skryptów):
 *   npm run calc -- list
 *   npm run calc -- <id> '<json>'
 *   npm run calc -- <id> @plik.json
 *   npm run calc -- maternityLeave --demo P05
 */
import { readFileSync } from 'node:fs';
import { createInterface, type Interface } from 'node:readline/promises';
import { inspect } from 'node:util';
import { config } from 'dotenv';

import { getDemoSnapshot } from '../src/core/demo/demoApi';
import { registerLocalDemoProfiles } from '../src/core/demo/localDemoProfiles';
import demoProfiles from '../src/dev/dummyData/mrodzic_compat_profiles_v1.json';

import {
  BenefitInputError,
  calculateAdoptionMaternityLeave,
  calculateBenefitBase,
  calculateMaternityBenefitAmount,
  calculateMaternityLeave,
  calculateParentalLeave,
  calculatePaternityLeave,
  calculateSicknessPregnancy,
  calculateSupplementaryMaternityLeave,
  LEAVE_KIND_LABELS,
  type BenefitBaseInput,
  type IncapacityPeriod,
  type LeaveKind,
  type LeaveSegment,
  type MonthlyPay,
  type PaternityLeavePart,
  type SupplementaryChild,
} from '../src/core/benefits';

// ---------- wejście z konsoli ----------

let rl: Interface;

/** Kolejka linii – działa zarówno w terminalu, jak i przy wejściu z potoku (printf ... | npm run calc). */
const pendingLines: string[] = [];
const waiters: ((line: string | null) => void)[] = [];
let inputClosed = false;

function setupInput() {
  rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
  rl.on('line', (line) => {
    const waiter = waiters.shift();
    if (waiter) waiter(line);
    else pendingLines.push(line);
  });
  rl.on('close', () => {
    inputClosed = true;
    waiters.splice(0).forEach((w) => w(null));
  });
}

function endOfInput(): never {
  console.log('\n(koniec wejścia)');
  process.exit(0);
}

function readLine(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const ready = pendingLines.shift();
  if (ready !== undefined) {
    if (!process.stdin.isTTY) process.stdout.write(`${ready}\n`);
    return Promise.resolve(ready);
  }
  if (inputClosed) endOfInput();
  return new Promise((resolve) =>
    waiters.push((line) => {
      if (line === null) endOfInput();
      if (!process.stdin.isTTY) process.stdout.write(`${line}\n`);
      resolve(line);
    }),
  );
}

// ---------- formatowanie ----------

const useColor = Boolean(process.stdout.isTTY);
const dim = (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);
const bold = (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s);

const zl = (v: number) => `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

/** Opis pola: jedna linia albo kilka. */
type Help = string | string[];

function printHelp(help?: Help) {
  if (!help) return;
  for (const line of Array.isArray(help) ? help : [help]) console.log(dim(`    › ${line}`));
}

// ---------- pytania ----------

async function ask(question: string, def?: string): Promise<string> {
  const suffix = def !== undefined && def !== '' ? ` [${def}]` : '';
  const answer = (await readLine(`  ${bold(question)}${suffix}: `)).trim();
  return answer === '' ? (def ?? '') : answer;
}

type NumberOpts = { help?: Help; min?: number; max?: number; optional?: boolean; int?: boolean };

async function askNumber(question: string, def: number | undefined, opts: NumberOpts = {}): Promise<number | undefined> {
  console.log('');
  printHelp(opts.help);
  for (;;) {
    const raw = await ask(question, def === undefined ? (opts.optional ? '-' : undefined) : String(def));
    if (opts.optional && (raw === '' || raw === '-')) return undefined;
    const value = Number(raw.replace(',', '.').replace(/\s/g, ''));
    if (raw === '' || !Number.isFinite(value) || (opts.int && !Number.isInteger(value))) {
      console.log(`    ✗ Podaj ${opts.int ? 'liczbę całkowitą' : 'liczbę (np. 5000 albo 5000,50)'}.`);
      continue;
    }
    if (opts.min !== undefined && value < opts.min) {
      console.log(`    ✗ Wartość nie może być mniejsza niż ${opts.min}.`);
      continue;
    }
    if (opts.max !== undefined && value > opts.max) {
      console.log(`    ✗ Wartość nie może być większa niż ${opts.max}.`);
      continue;
    }
    return value;
  }
}

async function num(question: string, def: number, help?: Help, range: { min?: number; max?: number } = { min: 0 }): Promise<number> {
  return (await askNumber(question, def, { help, ...range })) as number;
}

async function int(question: string, def: number, help?: Help, range: { min?: number; max?: number } = { min: 0 }): Promise<number> {
  return (await askNumber(question, def, { help, int: true, ...range })) as number;
}

async function bool(question: string, def: boolean, help?: Help): Promise<boolean> {
  console.log('');
  printHelp(help);
  for (;;) {
    const raw = (await ask(`${question} (t/n)`, def ? 't' : 'n')).toLowerCase();
    if (['t', 'tak', 'y', 'yes'].includes(raw)) return true;
    if (['n', 'nie', 'no'].includes(raw)) return false;
    console.log('    ✗ Wpisz t (tak) albo n (nie).');
  }
}

/** Akceptuje RRRR-MM-DD albo DD.MM.RRRR, zwraca RRRR-MM-DD. */
async function date(question: string, def: string | undefined, opts: { help?: Help; optional?: boolean } = {}): Promise<string | undefined> {
  console.log('');
  printHelp(opts.help);
  for (;;) {
    const raw = await ask(`${question} (RRRR-MM-DD lub DD.MM.RRRR)`, def ?? (opts.optional ? '-' : undefined));
    if (opts.optional && (raw === '' || raw === '-')) return undefined;
    const pl = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (pl) return `${pl[3]}-${pl[2].padStart(2, '0')}-${pl[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    console.log('    ✗ Nieprawidłowy format daty. Przykład: 2026-03-15 albo 15.03.2026.');
  }
}

async function reqDate(question: string, def: string | undefined, help?: Help): Promise<string> {
  return (await date(question, def, { help })) as string;
}

type Option<T extends string> = { value: T; label: string; description?: string };

async function choice<T extends string>(question: string, options: Option<T>[], def: T, help?: Help): Promise<T> {
  console.log('');
  printHelp(help);
  console.log(`  ${bold(question)}`);
  options.forEach((o, i) => {
    console.log(`    ${i + 1}) ${o.label}`);
    if (o.description) console.log(dim(`       ${o.description}`));
  });
  const defIndex = options.findIndex((o) => o.value === def) + 1;
  for (;;) {
    const raw = await ask('Wybór (numer)', String(defIndex));
    const idx = Number(raw);
    if (Number.isInteger(idx) && idx >= 1 && idx <= options.length) return options[idx - 1].value;
    console.log(`    ✗ Wpisz numer od 1 do ${options.length}.`);
  }
}

function section(title: string) {
  console.log(`\n  ── ${title} ──`);
}

// ---------- opisy wspólne ----------

const BENEFIT_BASE_HELP: Help = [
  'Miesięczna podstawa wymiaru zasiłku w zł – wynik kalkulatora 1 („Podstawa wymiaru zasiłku”).',
  'To kwota PO odjęciu 13,71% składek, a nie pensja brutto. Np. pensja 6000 zł brutto → podstawa 5177,40 zł.',
  'Nie znasz jej? Orientacyjnie: średnia pensja brutto × 0,8629.',
];

// ---------- definicje kalkulatorów ----------

type Calculator<I, R> = {
  id: string;
  title: string;
  /** Wprowadzenie wyświetlane przed pytaniami: co liczy kalkulator i co przygotować. */
  intro: string[];
  collect: () => Promise<I>;
  calculate: (input: I) => R;
  summarize: (result: R) => string[];
};

const define = <I, R>(c: Calculator<I, R>) => c as unknown as Calculator<unknown, unknown>;

const CALCULATORS = [
  define({
    id: 'benefitBase',
    title: 'Podstawa wymiaru zasiłku',
    intro: [
      'Liczy miesięczną podstawę wymiaru – kwotę, od której liczy się zasiłek chorobowy i macierzyński.',
      'Przygotuj: paski wynagrodzeń (lub zestawienie z kadr) z max. 12 pełnych miesięcy PRZED miesiącem,',
      'w którym zaczęło się zwolnienie / urlop. Przedsiębiorcy: deklaracje ZUS DRA z tego okresu.',
      'Wszystkie kwoty wpisuj BRUTTO – kalkulator sam odejmie 13,71% składek.',
      'Nie wpisuj składników wypłacanych także za czas L4 (np. dodatek stażowy) ani nagród uznaniowych.',
    ],
    async collect(): Promise<BenefitBaseInput> {
      const type = await choice(
        'Rodzaj ubezpieczonego:',
        [
          {
            value: 'employee',
            label: 'Pracownik',
            description: 'Umowa o pracę (pełny lub niepełny etat). Pierwsze dni L4 opłaca pracodawca.',
          },
          {
            value: 'non_employee',
            label: 'Nie-pracownik',
            description: 'Własna działalność, umowa zlecenia, współpracownik – z dobrowolnym ubezpieczeniem chorobowym.',
          },
        ],
        'employee',
        'Od tego zależy sposób liczenia: pracownik – z wynagrodzeń, nie-pracownik – z zadeklarowanej podstawy składek.',
      );

      if (type === 'non_employee') {
        const count = await int(
          'Liczba miesięcy przychodu',
          12,
          [
            'Ile pełnych miesięcy kalendarzowych opłacałaś/eś składkę chorobową przed miesiącem choroby. Maks. 12.',
            'Np. L4 od 10 marca 2026 → liczą się miesiące od marca 2025 do lutego 2026.',
            'Wpisz 0, jeśli choroba zaczęła się w pierwszym miesiącu ubezpieczenia.',
          ],
          { min: 0, max: 12 },
        );
        if (count === 0) {
          const declaredMonthlyBase = await num('Zadeklarowana podstawa składki (zł)', 5000, [
            'Podstawa składki chorobowej zadeklarowana na pierwszy miesiąc ubezpieczenia (z deklaracji ZUS DRA).',
            'Jeśli ubezpieczenie zaczęło się w trakcie miesiąca – podaj kwotę za pełny miesiąc.',
          ], { min: 0.01 });
          return { insuredType: 'non_employee', monthlyIncomes: [], declaredMonthlyBase };
        }
        const same = await bool('Ta sama podstawa składek w każdym miesiącu?', true, [
          't – co miesiąc deklarowana była ta sama kwota (np. stała podstawa w ZUS DRA).',
          'n – podasz kwotę dla każdego miesiąca osobno.',
        ]);
        const incomeHelp: Help = [
          'Kwota, od której opłacono składkę chorobową w tym miesiącu – pole „podstawa wymiaru składki',
          'na ubezpieczenie chorobowe” w ZUS DRA/RCA. Maks. 23 550 zł – wyższe kwoty zostaną obcięte do limitu.',
        ];
        const monthlyIncomes: number[] = [];
        if (same) {
          const v = await num('Miesięczna podstawa składki chorobowej (zł)', 8000, incomeHelp);
          for (let i = 0; i < count; i++) monthlyIncomes.push(v);
        } else {
          printHelp(['Podawaj miesiące od NAJSTARSZEGO do najnowszego.', ...incomeHelp]);
          for (let i = 0; i < count; i++) monthlyIncomes.push(await num(`Podstawa składki – miesiąc ${i + 1}/${count} (zł)`, 8000));
        }
        return { insuredType: 'non_employee', monthlyIncomes };
      }

      const count = await int(
        'Liczba pełnych miesięcy pracy przed chorobą',
        12,
        [
          'Ile PEŁNYCH miesięcy kalendarzowych pracy minęło przed miesiącem, w którym zaczęło się L4 / urlop. Maks. 12.',
          'Np. L4 od 10 marca 2026 → liczą się miesiące do lutego 2026 włącznie (marzec 2026 nie).',
          'Pracujesz krócej niż rok → wpisz tyle pełnych miesięcy, ile przepracowałaś/eś.',
          'Wpisz 0, jeśli choroba zaczęła się w pierwszym miesiącu pracy.',
        ],
        { min: 0, max: 12 },
      );
      const employmentFraction = await num(
        'Wymiar etatu',
        1,
        [
          'Ułamek etatu z umowy o pracę: 1 = pełny etat, 0.5 = pół etatu, 0.75 = 3/4 etatu.',
          'Wpływa tylko na minimalną podstawę: 4147,10 zł × etat (np. pół etatu → min. 2073,55 zł).',
        ],
        { min: 0.01, max: 1 },
      );

      if (count === 0) {
        const contractMonthlyGross = await num('Wynagrodzenie z umowy (zł brutto/mies.)', 7000, [
          'Miesięczne wynagrodzenie brutto zapisane w umowie o pracę – za PEŁNY miesiąc,',
          'nawet jeśli praca zaczęła się w trakcie miesiąca. Dolicz stałe miesięczne dodatki z umowy.',
        ], { min: 0.01 });
        return { insuredType: 'employee', months: [], employmentFraction, contractMonthlyGross };
      }

      const fixedHelp: Help = [
        'Wynagrodzenie zasadnicze brutto z umowy + stałe dodatki miesięczne (np. dodatek funkcyjny).',
        'Przy niepełnym miesiącu (L4, urlop bezpłatny) wpisz PEŁNĄ kwotę z umowy – kalkulator sam ją uzupełni.',
      ];
      const variableHelp: Help = [
        'Składniki, które pracodawca obniża za czas L4 – np. miesięczna premia regulaminowa, premia frekwencyjna.',
        'Kwota FAKTYCZNIE wypłacona za ten miesiąc. Brak takich składników → 0.',
      ];
      const nonSupplementedHelp: Help = [
        'Wynagrodzenie za nadgodziny, dodatek za pracę w nocy, prowizje – kwota faktycznie wypłacona.',
        'Te składniki nie są uzupełniane przy niepełnym miesiącu. Brak → 0.',
      ];

      const months: MonthlyPay[] = [];
      const same = await bool('Takie samo, pełne wynagrodzenie w każdym miesiącu?', true, [
        't – w każdym miesiącu ta sama pensja i brak nieobecności (L4, urlop bezpłatny). Urlop wypoczynkowy się nie liczy.',
        'n – podasz każdy miesiąc osobno, np. gdy pensja się zmieniała albo część miesiąca była na zwolnieniu.',
      ]);
      if (same) {
        const fixedGross = await num('Wynagrodzenie zasadnicze (zł brutto)', 6000, fixedHelp);
        const variableGross = await num('Składniki zmienne uzupełniane (zł brutto)', 0, variableHelp);
        const nonSupplementedGross = await num('Nadgodziny / dodatki nocne / prowizje (zł brutto)', 0, nonSupplementedHelp);
        for (let i = 0; i < count; i++) months.push({ fixedGross, variableGross, nonSupplementedGross });
      } else {
        printHelp('Podawaj miesiące od NAJSTARSZEGO do najnowszego (ostatni = miesiąc tuż przed chorobą).');
        for (let i = 0; i < count; i++) {
          section(`miesiąc ${i + 1}/${count}`);
          const first = i === 0;
          const fixedGross = await num('Wynagrodzenie zasadnicze (zł brutto)', 6000, first ? fixedHelp : undefined);
          const variableGross = await num('Składniki zmienne uzupełniane (zł brutto)', 0, first ? variableHelp : undefined);
          const nonSupplementedGross = await num('Nadgodziny / dodatki nocne / prowizje (zł brutto)', 0, first ? nonSupplementedHelp : undefined);
          const full = await bool(
            'Przepracowany cały miesiąc?',
            true,
            first
              ? [
                  't – brak L4, urlopu bezpłatnego i innych nieobecności (urlop wypoczynkowy = czas przepracowany).',
                  'n – podasz dni robocze i przepracowane; kalkulator uzupełni miesiąc albo go pominie.',
                ]
              : undefined,
          );
          const m: MonthlyPay = { month: String(i + 1), fixedGross, variableGross, nonSupplementedGross };
          if (!full) {
            m.workingDays = await int(
              'Obowiązujące dni pracy w miesiącu',
              21,
              'Ile dni wg grafiku/kalendarza należało przepracować w tym miesiącu (pełny etat: zwykle 20–23).',
              { min: 1, max: 31 },
            );
            m.daysWorked = await int(
              'Dni faktycznie przepracowane',
              15,
              [
                'Ile z tych dni faktycznie przepracowano (bez L4, urlopu bezpłatnego, nieobecności).',
                'Mniej niż połowa → miesiąc pominięty; co najmniej połowa → wynagrodzenie uzupełnione do pełnego miesiąca.',
              ],
              { min: 0, max: m.workingDays },
            );
          }
          months.push(m);
        }
      }

      const quarterlyBonusesGross: number[] = [];
      if (
        await bool('Premie kwartalne w ostatnich 4 kwartałach?', false, [
          'Premie lub nagrody wypłacane CO KWARTAŁ. Do podstawy wchodzi 1/12 sumy z 4 kwartałów przed miesiącem choroby.',
        ])
      ) {
        printHelp('Kwota brutto premii za każdy kwartał, od najstarszego. Brak premii w danym kwartale → 0.');
        for (let i = 0; i < 4; i++) quarterlyBonusesGross.push(await num(`Premia za kwartał ${i + 1}/4 (zł brutto)`, 0));
      }
      const annualBonusGross = (await bool('Trzynastka / nagroda roczna za poprzedni rok?', false, [
        'Dodatkowe wynagrodzenie roczne („trzynastka”) lub nagroda roczna wypłacona ZA poprzedni rok kalendarzowy.',
        'Do podstawy wchodzi 1/12 tej kwoty.',
      ]))
        ? await num('Kwota trzynastki / nagrody rocznej (zł brutto)', 6000)
        : 0;
      return { insuredType: 'employee', months, employmentFraction, quarterlyBonusesGross, annualBonusGross };
    },
    calculate: calculateBenefitBase,
    summarize: (r) => [
      `Podstawa wymiaru: ${zl(r.base)} / mies.  (stawka dzienna 100%: ${zl(r.dailyBase)})`,
      `Metoda: ${r.method}, miesięcy w średniej: ${r.monthsCounted}, średnio brutto: ${zl(r.averageMonthlyGross)}`,
      ...(r.minimumApplied ? ['Zastosowano minimalną podstawę.'] : []),
      ...(r.capApplied ? ['Zastosowano limit podstawy dla nie-pracownika.'] : []),
    ],
  }),

  define({
    id: 'sicknessPregnancy',
    title: 'Wynagrodzenie / zasiłek chorobowy w ciąży',
    intro: [
      'Liczy, kto i ile zapłaci za zwolnienie lekarskie (L4): najpierw pracodawca (wynagrodzenie chorobowe),',
      'potem ZUS (zasiłek chorobowy). W ciąży: 100% podstawy, maks. 270 dni w jednym okresie zasiłkowym.',
      'Przygotuj: podstawę wymiaru (kalkulator 1) oraz daty zwolnień z e-ZLA (PUE ZUS / eZUS → „Zwolnienia lekarskie”).',
    ],
    async collect() {
      const benefitBase = await num('Podstawa wymiaru (zł)', 6000, BENEFIT_BASE_HELP, { min: 0.01 });
      const insuranceStatus = await choice(
        'Status ubezpieczenia w czasie L4:',
        [
          {
            value: 'insured',
            label: 'W trakcie ubezpieczenia',
            description: 'Umowa trwa / składki są opłacane w dniu rozpoczęcia zwolnienia.',
          },
          {
            value: 'after_insurance_ended',
            label: 'Po ustaniu ubezpieczenia',
            description: 'Umowa się skończyła (np. na czas określony), a niezdolność trwa dalej – płaci wyłącznie ZUS.',
          },
        ],
        'insured',
      );
      const insuredType = (await bool('Umowa o pracę?', true, [
        't – pracownik: pierwsze dni L4 w roku opłaca pracodawca, potem ZUS.',
        'n – działalność, zlecenie itp.: zasiłek od 1. dnia wypłaca ZUS.',
      ]))
        ? ('employee' as const)
        : ('non_employee' as const);

      let birthYear: number | undefined;
      let employerDaysUsedBefore: number | undefined;
      if (insuredType === 'employee' && insuranceStatus === 'insured') {
        birthYear = await int(
          'Rok urodzenia osoby na L4',
          1995,
          [
            'Np. 1994. Do końca roku, w którym kończysz 50 lat, pracodawca płaci za 33 dni L4 w roku;',
            'od następnego roku kalendarzowego – tylko za 14 dni, a resztę płaci ZUS.',
          ],
          { min: 1900, max: 2100 },
        );
        employerDaysUsedBefore = await int(
          'Dni L4 opłacone już przez pracodawcę w tym roku',
          0,
          [
            'Ile dni wynagrodzenia chorobowego wypłacił pracodawca w roku, w którym zaczyna się pierwszy wpisany okres,',
            'ZA ZWOLNIENIA SPRZED tego okresu. Sprawdzisz na pasku („wynagrodzenie chorobowe”) albo w kadrach.',
            'Nie chorowałaś/eś wcześniej w tym roku albo wpisujesz te zwolnienia niżej → 0.',
          ],
          { min: 0, max: 366 },
        );
      }

      const count = await int(
        'Liczba okresów niezdolności (L4)',
        1,
        [
          'Ile osobnych okresów zwolnień wpisać. Zwolnienia następujące dzień po dniu możesz wpisać jako jeden okres.',
          'Dopisz też wcześniejsze L4 z ostatnich miesięcy – wpływają na okres zasiłkowy',
          '(przerwa do 60 dni = ten sam okres; wyjątek: L4 w ciąży po przerwie zaczyna nowy okres 270 dni).',
        ],
        { min: 1, max: 50 },
      );
      const periods: IncapacityPeriod[] = [];
      for (let i = 0; i < count; i++) {
        section(`okres ${i + 1}/${count}`);
        const first = i === 0;
        periods.push({
          from: await reqDate(
            'Pierwszy dzień zwolnienia',
            first ? '2026-03-01' : undefined,
            first ? ['Data „od” z zaświadczenia e-ZLA. Okresy wpisuj od najstarszego; nie mogą na siebie nachodzić.'] : undefined,
          ),
          to: await reqDate('Ostatni dzień zwolnienia', first ? '2026-05-31' : undefined, first ? 'Data „do” z e-ZLA (włącznie).' : undefined),
          pregnancy: await bool(
            'Zwolnienie w okresie ciąży?',
            true,
            first
              ? ['t – na e-ZLA jest kod B (niezdolność w okresie ciąży) → 100% podstawy.', 'n – zwykła choroba poza ciążą → 80% podstawy.']
              : undefined,
          ),
        });
      }
      return { benefitBase, insuranceStatus, insuredType, birthYear, employerDaysUsedBefore, periods };
    },
    calculate: calculateSicknessPregnancy,
    summarize: (r) => [
      ...r.segments.map(
        (s) =>
          `${s.from} – ${s.to}  ${String(s.days).padStart(3)} dni  ${({ employer: 'pracodawca', zus: 'ZUS', none: 'brak (limit)' } as const)[s.payer].padEnd(12)} ${pct(s.rate).padStart(5)}  ${zl(s.amount)}`,
      ),
      `Pracodawca: ${r.totals.employerDays} dni, ${zl(r.totals.employerAmount)} | ZUS: ${r.totals.zusDays} dni, ${zl(r.totals.zusAmount)} | bez świadczenia: ${r.totals.unpaidDays} dni`,
      `RAZEM: ${zl(r.totals.totalAmount)}`,
      ...r.benefitPeriods.map(
        (p) => `Okres zasiłkowy #${p.index + 1}: ${p.from} – ${p.to}, wykorzystano ${p.countedDays}/${p.limitDays} dni (zostało ${p.remainingDays})`,
      ),
    ],
  }),

  define({
    id: 'maternityLeave',
    title: 'Urlop macierzyński – długość',
    intro: [
      'Liczy długość urlopu macierzyńskiego po urodzeniu dziecka i – opcjonalnie – jego daty.',
      'Zasiłek za ten urlop: 100% podstawy (albo 81,5% przy wniosku o macierzyński + rodzicielski w 21 dni).',
    ],
    async collect() {
      return {
        childrenCount: await int(
          'Liczba dzieci z jednego porodu',
          1,
          'Ile dzieci urodziło się przy JEDNYM porodzie: 1 → 20 tyg., 2 → 31, 3 → 33, 4 → 35, 5 i więcej → 37 tyg.',
          { min: 1, max: 20 },
        ),
        startDate: await date('Pierwszy dzień urlopu', undefined, {
          optional: true,
          help: [
            'Zwykle dzień porodu (urlop można też zacząć do 6 tygodni przed przewidywaną datą porodu).',
            'Enter lub „-” = pomiń – policzę tylko długość urlopu, bez dat.',
          ],
        }),
      };
    },
    calculate: calculateMaternityLeave,
    summarize: (r) => [`${r.weeks} tygodni (${r.days} dni)${r.endDate ? `: ${r.startDate} – ${r.endDate}` : ''}, zasiłek ${pct(r.benefitRate)}`],
  }),

  define({
    id: 'adoptionMaternityLeave',
    title: 'Urlop na warunkach urlopu macierzyńskiego (adopcja / rodzina zastępcza)',
    intro: [
      'Przysługuje osobie, która przyjęła dziecko na wychowanie i złożyła wniosek o przysposobienie (adopcję),',
      'albo niezawodowej rodzinie zastępczej. Wymiar jak przy porodzie (20–37 tyg.), ale urlop kończy się najpóźniej',
      'dzień przed 14. urodzinami dziecka – i nigdy nie trwa krócej niż 9 tygodni. Zasiłek: 100% podstawy.',
    ],
    async collect() {
      const startDate = await reqDate('Pierwszy dzień urlopu', '2026-01-01', 'Zwykle dzień przyjęcia dziecka na wychowanie.');
      const count = await int(
        'Liczba dzieci przyjętych jednocześnie',
        1,
        [
          'Ile dzieci przyjęto na wychowanie w tym samym czasie (np. rodzeństwo). Od tego zależy wymiar z tabeli.',
          'Dzieci, które w dniu startu urlopu skończyły już 14 lat, nie są liczone.',
        ],
        { min: 1, max: 20 },
      );
      const childBirthDates: string[] = [];
      for (let i = 0; i < count; i++) {
        childBirthDates.push(
          await reqDate(
            `Data urodzenia dziecka ${i + 1}/${count}`,
            '2020-05-10',
            i === 0 ? 'Z aktu urodzenia lub postanowienia sądu. Potrzebna do sprawdzenia limitu 14 lat (decyduje najmłodsze dziecko).' : undefined,
          ),
        );
      }
      return { startDate, childBirthDates };
    },
    calculate: calculateAdoptionMaternityLeave,
    summarize: (r) => [
      `${r.days} dni (${r.weeks} tyg.): ${r.startDate} – ${r.endDate}; wymiar z tabeli ${r.tableWeeks} tyg. dla ${r.eligibleChildrenCount} dziecka/dzieci`,
      `Limit wieku (dzień przed 14. urodzinami): ${r.ageLimitDate}`,
    ],
  }),

  define({
    id: 'supplementaryMaternityLeave',
    title: 'Uzupełniający urlop macierzyński',
    intro: [
      'Dodatkowy urlop dla rodziców wcześniaków i dzieci hospitalizowanych po porodzie:',
      '1 tydzień urlopu za każdy (rozpoczęty) tydzień pobytu dziecka w szpitalu, maks. 8 albo 15 tygodni.',
      'Zaczyna się zaraz po urlopie macierzyńskim. Zasiłek: 100% podstawy.',
      'Przygotuj: kartę informacyjną noworodka / wypisy ze szpitala (tydzień ciąży, masa, daty pobytów).',
    ],
    async collect() {
      const birthDate = await reqDate('Data porodu', '2026-01-01', 'Data urodzenia dziecka z aktu urodzenia.');
      const gestationalWeek = await int(
        'Tydzień ciąży w chwili porodu',
        27,
        [
          'Z karty informacyjnej noworodka, np. „27+3 Hbd” → wpisz 27.',
          'Poniżej 28 → limit 15 tyg. | 28–36 → limit 8 tyg. (przy masie > 1000 g) |',
          '37 i więcej → limit 8 tyg., tylko gdy dziecko było w szpitalu min. 2 dni z rzędu między 5. a 28. dniem po porodzie',
          '(wtedy liczą się dni od 5. dnia po porodzie).',
        ],
        { min: 20, max: 45 },
      );
      const count = await int(
        'Liczba dzieci z porodu',
        1,
        'Przy ciąży mnogiej podaj dane każdego dziecka – liczy się najniższa masa i najdłuższa hospitalizacja.',
        { min: 1, max: 10 },
      );
      const children: SupplementaryChild[] = [];
      for (let i = 0; i < count; i++) {
        section(`dziecko ${i + 1}/${count}`);
        const first = i === 0;
        const birthWeightGrams = await num(
          'Masa urodzeniowa (g)',
          950,
          first ? 'W gramach, z karty noworodka, np. 950. Masa ≤ 1000 g → limit 15 tygodni niezależnie od tygodnia ciąży.' : undefined,
          { min: 1, max: 8000 },
        );
        const stays = await int(
          'Liczba pobytów w szpitalu',
          1,
          first
            ? [
                'Ile razy dziecko przebywało w szpitalu – łącznie z pobytem od porodu (np. neonatologia, OIOM).',
                'Kolejne pobyty (np. ponowne przyjęcie) się sumuje. 0 = dziecko nie było hospitalizowane.',
              ]
            : undefined,
          { min: 0, max: 20 },
        );
        const hospitalizations = [];
        for (let j = 0; j < stays; j++) {
          const showHelp = first && j === 0;
          hospitalizations.push({
            from: await reqDate(
              `Pobyt ${j + 1}/${stays} – od`,
              j === 0 ? birthDate : undefined,
              showHelp ? 'Pierwszy dzień pobytu (dla pobytu od porodu – data porodu). Dni przed porodem nie są liczone.' : undefined,
            ),
            to: await reqDate(
              `Pobyt ${j + 1}/${stays} – do`,
              j === 0 ? '2026-03-15' : undefined,
              showHelp ? 'Data wypisu ze szpitala (włącznie).' : undefined,
            ),
          });
        }
        children.push({ birthWeightGrams, hospitalizations });
      }
      const maternityLeaveEndDate = await date('Ostatni dzień urlopu macierzyńskiego', undefined, {
        optional: true,
        help: [
          'Opcjonalnie – np. wynik kalkulatora 3. Gdy podasz, wyliczę daty urlopu uzupełniającego (start = dzień później).',
          'Enter lub „-” = pomiń.',
        ],
      });
      return { birthDate, gestationalWeek, children, maternityLeaveEndDate };
    },
    calculate: calculateSupplementaryMaternityLeave,
    summarize: (r) => [
      `Przypadek ${r.caseNumber}: ${r.caseLabel}${r.multipleBirth ? ' (poród mnogi)' : ''}`,
      r.eligible
        ? `Przysługuje: ${r.weeks} tyg. (${r.days} dni), limit ${r.maxWeeks} tyg., dni w szpitalu: ${r.hospitalDaysCounted}${r.startDate ? `; ${r.startDate} – ${r.endDate}` : ''}`
        : 'Urlop uzupełniający NIE przysługuje.',
    ],
  }),

  define({
    id: 'parentalLeave',
    title: 'Urlop rodzicielski – długość i podział',
    intro: [
      'Urlop rodzicielski przysługuje po urlopie macierzyńskim i rodzice mogą go dzielić między siebie.',
      'Każdy rodzic ma 9 tygodni niezbywalnych – nie można ich oddać drugiemu rodzicowi (przepadają, jeśli nie wykorzysta).',
      'Zasiłek: 70% podstawy (albo 81,5% przy wniosku o macierzyński + cały rodzicielski w 21 dni po porodzie).',
    ],
    async collect() {
      const childrenCount = await int(
        'Liczba dzieci z jednego porodu',
        1,
        'Ile dzieci urodziło się przy jednym porodzie (lub przyjęto jednocześnie): 1 → 41 tyg., 2 i więcej → 43 tyg.',
        { min: 1, max: 20 },
      );
      const zaZyciem = await bool('Zaświadczenie „Za życiem”?', false, [
        't – lekarz wystawił zaświadczenie o ciężkim i nieodwracalnym upośledzeniu albo nieuleczalnej chorobie',
        'zagrażającej życiu dziecka (ustawa „Za życiem”). Urlop wydłuża się wtedy do 65 / 67 tygodni.',
      ]);
      const checkPlan = await bool('Sprawdzić podział urlopu między rodziców?', true, [
        't – podasz, ile tygodni chce wziąć każdy z rodziców, a kalkulator sprawdzi, czy to dopuszczalne.',
      ]);
      const plan = checkPlan
        ? {
            firstParentWeeks: await num('Tygodnie – pierwszy rodzic', 32, [
              'Ile tygodni urlopu rodzicielskiego weźmie pierwszy rodzic (zwykle mama). 0 = nie bierze.',
              'Maks. = wymiar − 9 tygodni drugiego rodzica (np. 41 − 9 = 32).',
            ]),
            secondParentWeeks: await num('Tygodnie – drugi rodzic', 9, [
              'Ile tygodni weźmie drugi rodzic (zwykle tata). Jeśli mniej niż 9 – niewykorzystane tygodnie niezbywalne przepadają.',
            ]),
          }
        : undefined;
      return { childrenCount, zaZyciem, plan };
    },
    calculate: calculateParentalLeave,
    summarize: (r) => [
      `Wymiar: ${r.totalWeeks} tyg., w tym ${r.nonTransferableWeeksPerParent} tyg. niezbywalne dla każdego rodzica; max dla jednego rodzica: ${r.maxWeeksForOneParent} tyg.`,
      `Zasiłek: ${pct(r.benefitRate)} (lub ${pct(r.upfrontBenefitRate)} przy wniosku w 21 dni)`,
      ...(r.plan ? [r.plan.valid ? `Podział poprawny, niewykorzystane: ${r.plan.unusedWeeks} tyg.` : `Podział NIEPOPRAWNY: ${r.plan.issues.join(' ')}`] : []),
    ],
  }),

  define({
    id: 'paternityLeave',
    title: 'Urlop ojcowski',
    intro: [
      'Urlop ojcowski: 2 tygodnie płatne 100% podstawy – jednorazowo albo w 2 częściach po 1 tygodniu.',
      'Przysługuje ojcu wychowującemu dziecko, niezależnie od urlopów matki. Kalkulator podaje termin wykorzystania',
      'i (opcjonalnie) sprawdza planowane części urlopu.',
    ],
    async collect() {
      const mode = await choice(
        'Sytuacja:',
        [
          { value: 'birth', label: 'Urodzenie dziecka', description: 'Termin: do dnia przed 1. urodzinami dziecka.' },
          {
            value: 'adoption',
            label: 'Przysposobienie (adopcja)',
            description: 'Termin: 12 miesięcy od uprawomocnienia postanowienia sądu, nie dłużej niż do 14. urodzin dziecka.',
          },
        ],
        'birth',
      );
      const childBirthDate = await reqDate('Data urodzenia dziecka', '2026-01-15', 'Z aktu urodzenia dziecka.');
      const adoptionFinalDate =
        mode === 'adoption'
          ? await reqDate(
              'Data uprawomocnienia przysposobienia',
              '2026-09-01',
              'Dzień, w którym postanowienie sądu o przysposobieniu stało się prawomocne (klauzula prawomocności na postanowieniu).',
            )
          : undefined;
      const count = await int(
        'Liczba części urlopu do sprawdzenia',
        2,
        [
          '1 = cały urlop naraz (2 tygodnie), 2 = dwie części po 1 tygodniu.',
          '0 = nie planuję jeszcze – pokaż tylko termin, do kiedy można wykorzystać urlop.',
        ],
        { min: 0, max: 5 },
      );
      const parts: PaternityLeavePart[] = [];
      for (let i = 0; i < count; i++) {
        section(`część ${i + 1}/${count}`);
        const first = i === 0;
        parts.push({
          start: await reqDate(
            'Pierwszy dzień tej części',
            first ? '2026-02-01' : '2026-06-01',
            first ? 'Nie wcześniej niż data urodzenia (lub uprawomocnienia przysposobienia).' : undefined,
          ),
          weeks: await int(
            'Długość tej części (tygodnie)',
            count === 1 ? 2 : 1,
            first ? 'Pełne tygodnie: 1 albo 2. Łącznie wszystkie części – maks. 2 tygodnie.' : undefined,
            { min: 1, max: 2 },
          ),
        });
      }
      return { mode, childBirthDate, adoptionFinalDate, parts: count > 0 ? parts : undefined };
    },
    calculate: calculatePaternityLeave,
    summarize: (r) => [
      `${r.totalWeeks} tyg. do wykorzystania od ${r.earliestStart} do ${r.deadline}, zasiłek ${pct(r.benefitRate)}`,
      ...(r.parts ? r.parts.map((p, i) => `Część ${i + 1}: ${p.start} – ${p.end} (${p.weeks} tyg.)`) : []),
      ...(r.valid === undefined ? [] : [r.valid ? 'Plan poprawny.' : `Plan NIEPOPRAWNY: ${r.issues?.join(' ')}`]),
    ],
  }),

  define({
    id: 'maternityBenefitAmount',
    title: 'Wysokość zasiłku macierzyńskiego',
    intro: [
      'Liczy kwotę zasiłku macierzyńskiego za wybrane urlopy JEDNEJ osoby – z jej własnej podstawy wymiaru.',
      'Drugi rodzic ma swoją podstawę – jego zasiłek policz osobnym uruchomieniem.',
      'Długości urlopów możesz wziąć z kalkulatorów 3–7.',
    ],
    async collect() {
      const benefitBase = await num('Podstawa wymiaru (zł)', 6000, BENEFIT_BASE_HELP, { min: 0.01 });
      const upfrontApplication = await bool('Wniosek o macierzyński + cały rodzicielski w ciągu 21 dni po porodzie?', true, [
        't – w jednym wniosku (do 21 dni po porodzie) prosisz od razu o urlop macierzyński i CAŁY rodzicielski:',
        '    przez cały ten czas zasiłek wynosi 81,5% podstawy.',
        'n – osobne wnioski: za urlop macierzyński 100%, za rodzicielski 70%.',
        'Łączna kwota jest prawie taka sama – różni się rozłożenie pieniędzy w czasie.',
      ]);
      const segmentHelp: Record<LeaveKind, Help> = {
        maternity: 'Urlop macierzyński po porodzie: 20 tyg. (1 dziecko), 31 (2), 33 (3), 35 (4), 37 (5+). Ojciec zwykle 0.',
        adoption_maternity: 'Urlop na warunkach macierzyńskiego (adopcja / rodzina zastępcza) – wynik kalkulatora 4. Nie dotyczy → 0.',
        supplementary_maternity: 'Uzupełniający urlop macierzyński (wcześniaki, hospitalizacja) – wynik kalkulatora 5. Zwykle 0.',
        paternity: 'Urlop ojcowski – tylko dla ojca, maks. 2 tygodnie. Dla mamy → 0.',
        parental: [
          'Część urlopu rodzicielskiego wykorzystywana przez TĘ osobę.',
          'Maks.: 32 tyg. (1 dziecko), 34 (2+), 56 / 58 przy „Za życiem” (wymiar − 9 tyg. drugiego rodzica).',
        ],
        parental_other_parent: [
          '9 niezbywalnych tygodni drugiego rodzica – zawsze 70%, także w wariancie 81,5%.',
          'Wpisz 9 tylko, jeśli liczysz zasiłek drugiego rodzica; przy liczeniu dla mamy zwykle 0.',
        ],
      };
      const defaults: Partial<Record<LeaveKind, number>> = { maternity: 20, parental: 32 };
      printHelp('Teraz podaj liczbę tygodni każdego urlopu (0 = pomiń). Można wpisać ułamek, np. 14.86.');
      const segments: LeaveSegment[] = [];
      for (const leave of Object.keys(LEAVE_KIND_LABELS) as LeaveKind[]) {
        const weeks = await num(`${LEAVE_KIND_LABELS[leave]} (tygodnie)`, defaults[leave] ?? 0, segmentHelp[leave], { min: 0, max: 80 });
        if (weeks > 0) segments.push({ leave, weeks });
      }
      return { benefitBase, upfrontApplication, segments };
    },
    calculate: calculateMaternityBenefitAmount,
    summarize: (r) => [
      ...r.segments.map(
        (s) => `${s.label.padEnd(52)} ${String(s.weeks).padStart(3)} tyg.  ${pct(s.rate).padStart(6)}  ${zl(s.monthlyAmount)}/mies.  razem ${zl(s.amount)}`,
      ),
      `RAZEM: ${zl(r.totalAmount)} za ${r.totalDays} dni`,
      `Wariant 81,5%: ${zl(r.variantComparison.upfrontTotal)} | wariant 100% + 70%: ${zl(r.variantComparison.separateTotal)} | różnica: ${zl(r.variantComparison.difference)}`,
    ],
  }),
];

// ---------- uruchamianie ----------

function printResult(calc: Calculator<unknown, unknown>, input: unknown) {
  try {
    const result = calc.calculate(input);
    console.log('\n── Wynik ─────────────────────────────────────────');
    calc.summarize(result).forEach((line) => console.log(`  ${line}`));
    const notes = (result as { notes?: string[] }).notes;
    if (notes?.length) notes.forEach((n) => console.log(`  ℹ ${n}`));
    console.log('\n── Pełny obiekt wyniku ───────────────────────────');
    console.log(inspect(result, { depth: null, colors: useColor, breakLength: 120 }));
    console.log('\n── Wejście (do trybu: npm run calc -- ' + calc.id + " '<json>') ──");
    console.log(JSON.stringify(input));
  } catch (e) {
    if (e instanceof BenefitInputError) {
      console.log(`\n  ✗ Błąd danych${e.field ? ` [${e.field}]` : ''}: ${e.message}`);
    } else {
      throw e;
    }
  }
}

async function demoMaternityLeaveInput(profileId: string | undefined) {
  // Te scenariusze opisują poród i początek podstawowego urlopu; P08 wymaga osobnych zasad.
  if (!profileId || !['P01', 'P05', 'P10'].includes(profileId)) {
    throw new Error('Podaj profil z podstawowym urlopem po porodzie: P01, P05 lub P10.');
  }
  config({ quiet: true });
  registerLocalDemoProfiles(demoProfiles);
  const baseUrl = process.env.EXPO_PUBLIC_DEMO_API_URL?.trim() || undefined;
  const profile = await getDemoSnapshot(profileId, AbortSignal.timeout(10000), baseUrl);
  const startDate = profile.me.work?.maternityLeave?.startDate;
  if (!startDate) throw new Error('W profilu brakuje daty początku urlopu macierzyńskiego.');
  const newborns = profile.children.filter((child) => child.status === 'born' && child.birthDate === startDate);
  if (!newborns.length || (newborns.length > 1 && !newborns.every(
    (child) => child.multipleBirthGroupId && child.multipleBirthGroupId === newborns[0].multipleBirthGroupId,
  ))) {
    throw new Error('Profil nie określa jednoznacznie liczby dzieci z tego porodu.');
  }
  return { startDate, childrenCount: newborns.length };
}

async function runNonInteractive(args: string[]) {
  const [id, payload] = args;
  if (id === 'list') {
    CALCULATORS.forEach((c) => console.log(`${c.id.padEnd(30)} ${c.title}`));
    return;
  }
  const calc = CALCULATORS.find((c) => c.id === id);
  if (!calc) {
    console.error(`Nieznany kalkulator „${id}”. Dostępne: ${CALCULATORS.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  if (!payload) {
    console.error(`Podaj dane wejściowe: npm run calc -- ${id} '<json>'  lub  @plik.json`);
    process.exit(1);
  }
  if (payload === '--demo') {
    if (id !== 'maternityLeave') throw new Error('Tryb SQLite jest dostępny dla kalkulatora maternityLeave.');
    const input = await demoMaternityLeaveInput(args[2]);
    console.log(`SYMULACJA – DANE FIKCYJNE (${args[2]})`);
    printResult(calc, input);
    return;
  }
  const json = payload.startsWith('@') ? readFileSync(payload.slice(1), 'utf8') : payload;
  printResult(calc, JSON.parse(json));
}

async function runInteractive() {
  setupInput();
  console.log('\nKalkulatory zasiłków 2026 – tryb testowy.');
  printHelp([
    'Enter = wartość podana w nawiasie [ ] (przykładowe dane).',
    'Kwoty: z kropką lub przecinkiem (5000,50). Daty: RRRR-MM-DD albo DD.MM.RRRR. Tak/nie: t / n.',
  ]);
  console.log('');
  try {
    for (;;) {
      console.log('Wybierz kalkulator:');
      CALCULATORS.forEach((c, i) => console.log(`  ${i + 1}) ${c.title}`));
      console.log('  0) Wyjście');
      const pick = Number(await ask('Numer', '1'));
      if (pick === 0) break;
      const calc = CALCULATORS[pick - 1];
      if (!calc) {
        console.log(`  ✗ Wpisz numer od 0 do ${CALCULATORS.length}.\n`);
        continue;
      }
      console.log(`\n=== ${calc.title} ===`);
      calc.intro.forEach((line) => console.log(dim(`  ${line}`)));
      try {
        printResult(calc, await calc.collect());
      } catch (e) {
        if (e instanceof BenefitInputError) console.log(`\n  ✗ ${e.message}`);
        else throw e;
      }
      if (!(await bool('Kolejne obliczenie?', true))) break;
      console.log('');
    }
  } finally {
    rl.close();
  }
}

const cliArgs = process.argv.slice(2);
if (cliArgs.length > 0) {
  void runNonInteractive(cliArgs).catch((e: unknown) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  });
} else {
  void runInteractive();
}
