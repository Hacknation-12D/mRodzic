/**
 * npm run calc
 * Interaktywne CLI do ręcznego testowania kalkulatorów zasiłków (src/core/benefits).
 * Enter przy pytaniu = wartość domyślna (przykładowe dane), więc można „przeklikać” każdy kalkulator.
 *
 * Tryb bez pytań (np. do skryptów):
 *   npm run calc -- list
 *   npm run calc -- <id> '<json>'
 *   npm run calc -- <id> @plik.json
 */
import { readFileSync } from 'node:fs';
import { createInterface, type Interface } from 'node:readline/promises';
import { inspect } from 'node:util';

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

function readLine(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  const ready = pendingLines.shift();
  if (!process.stdin.isTTY && ready !== undefined) process.stdout.write(`${ready}\n`);
  if (ready !== undefined) return Promise.resolve(ready);
  if (inputClosed) {
    console.log('\n(koniec wejścia)');
    process.exit(0);
  }
  return new Promise((resolve) =>
    waiters.push((line) => {
      if (line === null) {
        console.log('\n(koniec wejścia)');
        process.exit(0);
      }
      if (!process.stdin.isTTY) process.stdout.write(`${line}\n`);
      resolve(line);
    }),
  );
}

const zl = (v: number) => `${v.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

async function ask(question: string, def?: string): Promise<string> {
  const suffix = def !== undefined && def !== '' ? ` [${def}]` : '';
  const answer = (await readLine(`  ${question}${suffix}: `)).trim();
  return answer === '' ? (def ?? '') : answer;
}

async function askNumber(question: string, def?: number, opts: { optional?: boolean; int?: boolean } = {}): Promise<number | undefined> {
  for (;;) {
    const raw = await ask(question, def === undefined ? (opts.optional ? '-' : undefined) : String(def));
    if (opts.optional && (raw === '' || raw === '-')) return undefined;
    const value = Number(raw.replace(',', '.').replace(/\s/g, ''));
    if (raw !== '' && Number.isFinite(value) && (!opts.int || Number.isInteger(value))) return value;
    console.log(`    ✗ Podaj ${opts.int ? 'liczbę całkowitą' : 'liczbę'}.`);
  }
}

async function num(question: string, def: number): Promise<number> {
  return (await askNumber(question, def)) as number;
}

async function int(question: string, def: number): Promise<number> {
  return (await askNumber(question, def, { int: true })) as number;
}

async function bool(question: string, def: boolean): Promise<boolean> {
  for (;;) {
    const raw = (await ask(`${question} (t/n)`, def ? 't' : 'n')).toLowerCase();
    if (['t', 'tak', 'y', 'yes'].includes(raw)) return true;
    if (['n', 'nie', 'no'].includes(raw)) return false;
    console.log('    ✗ Wpisz t albo n.');
  }
}

/** Akceptuje RRRR-MM-DD albo DD.MM.RRRR, zwraca RRRR-MM-DD. */
async function date(question: string, def?: string, optional = false): Promise<string | undefined> {
  for (;;) {
    const raw = await ask(`${question} (RRRR-MM-DD lub DD.MM.RRRR)`, def ?? (optional ? '-' : undefined));
    if (optional && (raw === '' || raw === '-')) return undefined;
    const pl = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (pl) return `${pl[3]}-${pl[2].padStart(2, '0')}-${pl[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    console.log('    ✗ Nieprawidłowy format daty.');
  }
}

async function reqDate(question: string, def: string): Promise<string> {
  return (await date(question, def)) as string;
}

async function choice<T extends string>(question: string, options: { value: T; label: string }[], def: T): Promise<T> {
  console.log(`  ${question}`);
  options.forEach((o, i) => console.log(`    ${i + 1}) ${o.label}`));
  const defIndex = options.findIndex((o) => o.value === def) + 1;
  for (;;) {
    const idx = await int('Wybór', defIndex);
    if (idx >= 1 && idx <= options.length) return options[idx - 1].value;
    console.log('    ✗ Nie ma takiej opcji.');
  }
}

// ---------- definicje kalkulatorów ----------

type Calculator<I, R> = {
  id: string;
  title: string;
  collect: () => Promise<I>;
  calculate: (input: I) => R;
  summarize: (result: R) => string[];
};

const define = <I, R>(c: Calculator<I, R>) => c as unknown as Calculator<unknown, unknown>;

const CALCULATORS = [
  define({
    id: 'benefitBase',
    title: 'Podstawa wymiaru zasiłku',
    async collect(): Promise<BenefitBaseInput> {
      const type = await choice(
        'Rodzaj ubezpieczonego:',
        [
          { value: 'employee', label: 'Pracownik (umowa o pracę)' },
          { value: 'non_employee', label: 'Nie-pracownik (przedsiębiorca, zleceniobiorca)' },
        ],
        'employee',
      );
      if (type === 'non_employee') {
        const count = await int('Ile miesięcy przychodu podać (0 = 1. miesiąc ubezpieczenia)', 12);
        if (count === 0) {
          return { insuredType: 'non_employee', monthlyIncomes: [], declaredMonthlyBase: await num('Zadeklarowana podstawa składki', 5000) };
        }
        const same = await bool('Taki sam przychód w każdym miesiącu?', true);
        const monthlyIncomes: number[] = [];
        if (same) {
          const v = await num('Miesięczny przychód (podstawa składki chorobowej)', 8000);
          for (let i = 0; i < count; i++) monthlyIncomes.push(v);
        } else {
          for (let i = 0; i < count; i++) monthlyIncomes.push(await num(`Przychód – miesiąc ${i + 1}`, 8000));
        }
        return { insuredType: 'non_employee', monthlyIncomes };
      }

      const count = await int('Ile pełnych miesięcy przed chorobą podać (max 12; 0 = choroba w 1. miesiącu pracy)', 12);
      const employmentFraction = await num('Wymiar etatu (np. 1, 0.5)', 1);
      if (count === 0) {
        return { insuredType: 'employee', months: [], employmentFraction, contractMonthlyGross: await num('Wynagrodzenie z umowy (brutto/mies.)', 7000) };
      }
      const months: MonthlyPay[] = [];
      const same = await bool('Takie samo, pełne wynagrodzenie w każdym miesiącu?', true);
      if (same) {
        const fixedGross = await num('Wynagrodzenie zasadnicze brutto', 6000);
        const variableGross = await num('Składniki zmienne uzupełniane (premia regulaminowa)', 0);
        const nonSupplementedGross = await num('Nadgodziny / dodatki nocne / prowizje', 0);
        for (let i = 0; i < count; i++) months.push({ fixedGross, variableGross, nonSupplementedGross });
      } else {
        for (let i = 0; i < count; i++) {
          console.log(`  — miesiąc ${i + 1}/${count}`);
          const fixedGross = await num('  Wynagrodzenie zasadnicze z umowy (brutto)', 6000);
          const variableGross = await num('  Składniki zmienne uzupełniane', 0);
          const nonSupplementedGross = await num('  Nadgodziny / dodatki nocne / prowizje', 0);
          const full = await bool('  Przepracowany cały miesiąc?', true);
          const m: MonthlyPay = { month: String(i + 1), fixedGross, variableGross, nonSupplementedGross };
          if (!full) {
            m.workingDays = await int('  Obowiązujące dni pracy', 21);
            m.daysWorked = await int('  Dni przepracowane', 15);
          }
          months.push(m);
        }
      }
      const quarterlyBonusesGross: number[] = [];
      if (await bool('Premie kwartalne w ostatnich 4 kwartałach?', false)) {
        for (let i = 0; i < 4; i++) quarterlyBonusesGross.push(await num(`Premia za kwartał ${i + 1}`, 0));
      }
      const annualBonusGross = (await bool('Trzynastka / nagroda roczna za poprzedni rok?', false)) ? await num('Kwota brutto', 6000) : 0;
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
    async collect() {
      const benefitBase = await num('Podstawa wymiaru (z kalkulatora 1)', 6000);
      const insuranceStatus = await choice(
        'Status ubezpieczenia:',
        [
          { value: 'insured', label: 'W trakcie ubezpieczenia' },
          { value: 'after_insurance_ended', label: 'Po ustaniu ubezpieczenia' },
        ],
        'insured',
      );
      const insuredType = (await bool('Czy to pracownik (umowa o pracę)?', true)) ? ('employee' as const) : ('non_employee' as const);
      let birthYear: number | undefined;
      let employerDaysUsedBefore: number | undefined;
      if (insuredType === 'employee' && insuranceStatus === 'insured') {
        birthYear = await int('Rok urodzenia', 1995);
        employerDaysUsedBefore = await int('Dni wynagrodzenia chorobowego wykorzystane wcześniej w tym roku', 0);
      }
      const count = await int('Ile okresów niezdolności (L4)?', 1);
      const periods: IncapacityPeriod[] = [];
      for (let i = 0; i < count; i++) {
        console.log(`  — okres ${i + 1}/${count}`);
        periods.push({
          from: await reqDate('  Od', i === 0 ? '2026-03-01' : ''),
          to: await reqDate('  Do', i === 0 ? '2026-05-31' : ''),
          pregnancy: await bool('  W okresie ciąży?', true),
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
    async collect() {
      return {
        childrenCount: await int('Liczba dzieci z jednego porodu', 1),
        startDate: await date('Data rozpoczęcia urlopu', '-', true),
      };
    },
    calculate: calculateMaternityLeave,
    summarize: (r) => [`${r.weeks} tygodni (${r.days} dni)${r.endDate ? `: ${r.startDate} – ${r.endDate}` : ''}, zasiłek ${pct(r.benefitRate)}`],
  }),

  define({
    id: 'adoptionMaternityLeave',
    title: 'Urlop na warunkach urlopu macierzyńskiego (adopcja / rodzina zastępcza)',
    async collect() {
      const startDate = await reqDate('Data rozpoczęcia urlopu', '2026-01-01');
      const count = await int('Ile dzieci przyjętych jednocześnie?', 1);
      const childBirthDates: string[] = [];
      for (let i = 0; i < count; i++) childBirthDates.push(await reqDate(`Data urodzenia dziecka ${i + 1}`, '2020-05-10'));
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
    async collect() {
      const birthDate = await reqDate('Data porodu', '2026-01-01');
      const gestationalWeek = await int('Tydzień ciąży w chwili porodu', 27);
      const count = await int('Liczba dzieci z porodu', 1);
      const children: SupplementaryChild[] = [];
      for (let i = 0; i < count; i++) {
        console.log(`  — dziecko ${i + 1}/${count}`);
        const birthWeightGrams = await num('  Masa urodzeniowa (g)', 950);
        const stays = await int('  Liczba pobytów w szpitalu', 1);
        const hospitalizations = [];
        for (let j = 0; j < stays; j++) {
          hospitalizations.push({
            from: await reqDate(`  Pobyt ${j + 1} od`, j === 0 ? birthDate : ''),
            to: await reqDate(`  Pobyt ${j + 1} do`, j === 0 ? '2026-03-15' : ''),
          });
        }
        children.push({ birthWeightGrams, hospitalizations });
      }
      const maternityLeaveEndDate = await date('Ostatni dzień urlopu macierzyńskiego (opcjonalnie)', '-', true);
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
    async collect() {
      const childrenCount = await int('Liczba dzieci z jednego porodu', 1);
      const zaZyciem = await bool('Zaświadczenie „Za życiem”?', false);
      const plan = (await bool('Sprawdzić podział między rodziców?', true))
        ? { firstParentWeeks: await num('Tygodnie – pierwszy rodzic', 32), secondParentWeeks: await num('Tygodnie – drugi rodzic', 9) }
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
    async collect() {
      const mode = await choice(
        'Sytuacja:',
        [
          { value: 'birth', label: 'Urodzenie dziecka' },
          { value: 'adoption', label: 'Przysposobienie' },
        ],
        'birth',
      );
      const childBirthDate = await reqDate('Data urodzenia dziecka', '2026-01-15');
      const adoptionFinalDate = mode === 'adoption' ? await reqDate('Data uprawomocnienia przysposobienia', '2026-09-01') : undefined;
      const count = await int('Ile części chcesz sprawdzić (0 = tylko termin)', 2);
      const parts: PaternityLeavePart[] = [];
      for (let i = 0; i < count; i++) {
        parts.push({
          start: await reqDate(`Część ${i + 1} – start`, i === 0 ? '2026-02-01' : '2026-06-01'),
          weeks: await int(`Część ${i + 1} – tygodnie`, count === 1 ? 2 : 1),
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
    async collect() {
      const benefitBase = await num('Podstawa wymiaru (z kalkulatora 1)', 6000);
      const upfrontApplication = await bool('Wniosek o macierzyński + cały rodzicielski w ciągu 21 dni (81,5%)?', true);
      const segments: LeaveSegment[] = [];
      const kinds = Object.keys(LEAVE_KIND_LABELS) as LeaveKind[];
      const defaults: Partial<Record<LeaveKind, number>> = { maternity: 20, parental: 32, parental_other_parent: 0 };
      console.log('  Podaj liczbę tygodni każdego urlopu (0 = pomiń):');
      for (const leave of kinds) {
        const weeks = await num(`  ${LEAVE_KIND_LABELS[leave]}`, defaults[leave] ?? 0);
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
    console.log(inspect(result, { depth: null, colors: process.stdout.isTTY, breakLength: 120 }));
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

function runNonInteractive(args: string[]) {
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
  const json = payload.startsWith('@') ? readFileSync(payload.slice(1), 'utf8') : payload;
  printResult(calc, JSON.parse(json));
}

async function runInteractive() {
  setupInput();
  console.log('\nKalkulatory zasiłków 2026 – tryb testowy. Enter = wartość domyślna.\n');
  try {
    for (;;) {
      console.log('Wybierz kalkulator:');
      CALCULATORS.forEach((c, i) => console.log(`  ${i + 1}) ${c.title}`));
      console.log('  0) Wyjście');
      const pick = await int('Numer', 1);
      if (pick === 0) break;
      const calc = CALCULATORS[pick - 1];
      if (!calc) {
        console.log('  ✗ Nie ma takiego kalkulatora.\n');
        continue;
      }
      console.log(`\n=== ${calc.title} ===`);
      try {
        printResult(calc, await calc.collect());
      } catch (e) {
        if (e instanceof BenefitInputError) console.log(`\n  ✗ ${e.message}`);
        else throw e;
      }
      console.log('');
      if (!(await bool('Kolejne obliczenie?', true))) break;
      console.log('');
    }
  } finally {
    rl.close();
  }
}

const cliArgs = process.argv.slice(2);
if (cliArgs.length > 0) runNonInteractive(cliArgs);
else void runInteractive();
