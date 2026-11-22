import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  addDateDays,
} from '@/core/applications/engine';
import {
  assessEligibility,
  benefitBaseFromAverageGross,
  calculateFamilyLeavePlan,
  legal,
  partnerDefaults,
  type FamilyLeavePlan,
  type FamilyLeaveSegment,
} from '@/core/benefits';
import { useToday } from '@/core/clock/useToday';
import { useLegalRevision } from '@/core/legal/legal.store';
import { maternityWeeksFor, parentalPoolWeeks } from '@/core/legal/parameters';
import { goToCalculator } from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import type { Employment, Profile } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { isoToPolishDate, toISODate } from '@/shared/lib/date';
import { formatMoney, parseAmount } from '@/shared/lib/money';
import {
  Alert,
  AppText,
  Button,
  Card,
  DateField,
  IconBadge,
  Screen,
  SectionHeader,
  SegmentedControl,
  Select,
  StatTile,
  Stepper,
  TextField,
  ToggleRow,
} from '@/shared/ui';

type Who = 'me' | 'partner';
type ParentState = { name: string; employment: Employment; grossText: string };
const EMPLOYMENTS: Employment[] = ['employment_contract', 'self_employed', 'civil_contract', 'student', 'unemployed', 'other'];
const WORK = [
  { value: '0', label: 'Bez pracy' },
  { value: '0.25', label: '¼ etatu' },
  { value: '0.5', label: '½ etatu' },
] as const;

const avgGross = (parent: Profile['me'] | undefined) => {
  const e = parent?.work?.earnings ?? [];
  return e.length ? e.reduce((n, x) => n + x.gross, 0) / e.length : (parent?.work?.monthlyGross ?? 0);
};
const money = (cents: number) => formatMoney(cents / 100);

function initial(profile: Profile | null, today: string) {
  const child = profile?.children.find((c) => c.status === 'born' && c.birthDate) ?? profile?.children[0];
  const birth = child?.birthDate ?? child?.dueDate ?? today;
  const count = child?.multipleBirthGroupId ? (profile?.children.filter((c) => c.multipleBirthGroupId === child.multipleBirthGroupId).length ?? 1) : 1;
  const partner = partnerDefaults(profile);
  const parents: Record<Who, ParentState> = {
    me: { name: profile?.me.firstName ?? 'Rodzic 1', employment: profile?.me.employment ?? 'employment_contract', grossText: String(Math.round(avgGross(profile?.me))) },
    partner: {
      name: profile?.partner?.firstName ?? 'Rodzic 2',
      employment: partner?.employment ?? 'employment_contract',
      grossText: String(Math.round(partner?.averageMonthlyGross ?? 0)),
    },
  };
  return { birth, count: Math.min(Math.max(count, 1), 5), parents };
}

/** Wariant startowy: matka bierze rodzicielski po macierzyńskim, ojciec – swoje 9 tygodni. */
function presetPlan(kind: 'classic' | 'parallel' | 'work', earliest: string, pool: number, reserved: number): FamilyLeaveSegment[] {
  const id = (n: number) => `${kind}-${n}`;
  const mine = pool - reserved;
  if (kind === 'parallel') {
    return [
      { id: id(1), parent: 'me', start: earliest, weeks: mine, workFraction: 0, workDuringExtension: false, reserved: false },
      { id: id(2), parent: 'partner', start: earliest, weeks: reserved, workFraction: 0, workDuringExtension: false, reserved: true },
    ];
  }
  if (kind === 'work') {
    return [
      { id: id(1), parent: 'me', start: earliest, weeks: 16, workFraction: 0, workDuringExtension: false, reserved: false },
      { id: id(2), parent: 'me', start: addDateDays(earliest, 16 * 7), weeks: mine - 16, workFraction: 0.5, workDuringExtension: true, reserved: false },
    ];
  }
  return [
    { id: id(1), parent: 'me', start: earliest, weeks: mine, workFraction: 0, workDuringExtension: false, reserved: false },
    { id: id(2), parent: 'partner', start: addDateDays(earliest, mine * 7), weeks: reserved, workFraction: 0, workDuringExtension: false, reserved: true },
  ];
}

function Planner() {
  const profile = useProfileStore((s) => s.profile);
  const today = toISODate(useToday());
  const revision = useLegalRevision();
  const start = useMemo(() => initial(profile, today), [profile, today]);
  const [birth, setBirth] = useState(start.birth);
  const [count, setCount] = useState(start.count);
  const [zaZyciem, setZaZyciem] = useState(false);
  const [parents, setParents] = useState(start.parents);

  const p = legal();
  const pool = parentalPoolWeeks(count, zaZyciem);
  const earliest = birth ? addDateDays(birth, maternityWeeksFor(count) * 7) : '';
  const [segments, setSegments] = useState<FamilyLeaveSegment[]>(() => (earliest ? presetPlan('classic', earliest, pool, p.parentalNonTransferableWeeks) : []));

  const parentInfo = (who: Who) => {
    const gross = parseAmount(parents[who].grossText);
    const eligibility = assessEligibility({ kind: 'birth', employment: parents[who].employment, sicknessInsurance: 'yes', eventDate: birth || today });
    const base = benefitBaseFromAverageGross(Number.isFinite(gross) ? gross : 0, parents[who].employment);
    return { eligible: eligibility.status === 'eligible' && base > 0, base, gross };
  };
  const info = { me: parentInfo('me'), partner: parentInfo('partner') };

  const plan: FamilyLeavePlan = {
    childBirthDate: birth || today,
    earliestStart: earliest || undefined,
    childrenCount: count,
    zaZyciem,
    parents: {
      me: { baseCents: Math.round(info.me.base * 100), eligible: info.me.eligible, label: parents.me.name },
      partner: { baseCents: Math.round(info.partner.base * 100), eligible: info.partner.eligible, label: parents.partner.name },
    },
    segments,
  };
  // Liczone przy każdym renderze (tanie); `revision` odświeża ekran po zmianie parametrów w panelu.
  void revision;
  const result = calculateFamilyLeavePlan(plan);
  const blocking = result.issues.filter((i) => !i.includes('nie jest potwierdzone'));
  const warnings = result.issues.filter((i) => i.includes('nie jest potwierdzone'));

  const update = (i: number, patch: Partial<FamilyLeaveSegment>) => setSegments((list) => list.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  const addSegment = () => {
    const lastEnd = result.periods.at(-1)?.end;
    const startDate = lastEnd ? addDateDays(lastEnd, 1) : earliest;
    setSegments((list) => [
      ...list,
      { id: `${Date.now()}`, parent: list.at(-1)?.parent === 'me' ? 'partner' : 'me', start: startDate || earliest, weeks: Math.min(p.parentalNonTransferableWeeks, Math.max(1, result.unusedWeeks)), workFraction: 0, workDuringExtension: false, reserved: false },
    ]);
  };
  const setParent = (who: Who, patch: Partial<ParentState>) => setParents((x) => ({ ...x, [who]: { ...x[who], ...patch } }));

  return (
    <Screen keyboard>
      <Card tone="tinted" elevation={0} className="gap-3 p-5">
        <View className="flex-row items-center gap-3">
          <IconBadge icon="people-outline" size={48} />
          <AppText variant="title" accessibilityRole="header" className="flex-1">
            Urlop rodzicielski dla obojga rodziców
          </AppText>
        </View>
        <AppText>
          Podziel {pool} tyg. urlopu rodzicielskiego między rodziców, zaplanuj części jednoczesne albo naprzemienne i sprawdź, ile dostanie każde z Was –
          także przy łączeniu urlopu z pracą do ½ etatu (urlop wtedy się wydłuża, a zasiłek maleje proporcjonalnie).
        </AppText>
        <Button label="Wróć do kalkulatora świadczeń" variant="ghost" compact icon="calculator-outline" onPress={goToCalculator} />
      </Card>

      <View className="gap-4 md:flex-row md:items-start">
        <View className="gap-3 md:w-[44%]">
          <SectionHeader title="Dziecko" />
          <Card className="gap-4 p-5">
            <DateField label="Data urodzenia dziecka" value={birth} onChange={(v) => setBirth(v ?? '')} />
            <Stepper label="Liczba dzieci z jednego porodu" value={count} min={1} max={5} onChange={setCount} />
            <ToggleRow label="Zaświadczenie „Za życiem”" hint="Wydłuża pulę do 65 / 67 tygodni." value={zaZyciem} onChange={setZaZyciem} />
            {earliest ? (
              <AppText variant="small" tone="muted">
                Urlop macierzyński kończy się {isoToPolishDate(addDateDays(earliest, -1))} – rodzicielski może zacząć się od {isoToPolishDate(earliest)} i trwać do{' '}
                {isoToPolishDate(result.lastDay || earliest)}.
              </AppText>
            ) : null}
          </Card>

          <SectionHeader title="Rodzice" />
          {(['me', 'partner'] as const).map((who) => (
            <Card key={who} className="gap-3 p-5">
              <TextField label="Imię" value={parents[who].name} onChangeText={(v) => setParent(who, { name: v })} />
              <Select
                label="Forma zatrudnienia"
                value={parents[who].employment}
                options={EMPLOYMENTS.map((e) => ({ value: e, label: pl.employment[e] }))}
                onChange={(v) => v && setParent(who, { employment: v })}
              />
              <TextField
                label="Przeciętne wynagrodzenie brutto (12 mies.)"
                value={parents[who].grossText}
                onChangeText={(v) => setParent(who, { grossText: v })}
                keyboardType="decimal-pad"
                inputMode="decimal"
                hint={info[who].base > 0 ? `Podstawa zasiłku: ${formatMoney(info[who].base)} · rodzicielski ${formatMoney(info[who].base * p.rates.parental)} / mies.` : undefined}
              />
              {!info[who].eligible ? (
                <AppText variant="small" tone="warning">
                  Brak potwierdzonego prawa do zasiłku – urlop tej osoby nie będzie płatny przez ZUS.
                </AppText>
              ) : null}
            </Card>
          ))}
        </View>

        <View className="gap-3 md:flex-1">
          <SectionHeader title="Plan urlopu" />
          <View className="flex-row flex-wrap gap-2">
            <Button compact variant="secondary" label="Po kolei: mama, potem tata" onPress={() => setSegments(presetPlan('classic', earliest, pool, p.parentalNonTransferableWeeks))} />
            <Button compact variant="secondary" label="Razem w tym samym czasie" onPress={() => setSegments(presetPlan('parallel', earliest, pool, p.parentalNonTransferableWeeks))} />
            <Button compact variant="secondary" label="Powrót do pracy na ½ etatu" onPress={() => setSegments(presetPlan('work', earliest, pool, p.parentalNonTransferableWeeks))} />
          </View>
          {segments.map((s, i) => (
            <Card key={s.id} className="gap-3 p-5">
              <View className="flex-row items-center justify-between gap-2">
                <AppText variant="heading">Część {i + 1}</AppText>
                <Button compact variant="ghost" icon="trash-outline" label="Usuń" onPress={() => setSegments((list) => list.filter((_, n) => n !== i))} />
              </View>
              <SegmentedControl<Who>
                accessibilityLabel="Kto korzysta"
                segments={[
                  { value: 'me', label: parents.me.name || 'Rodzic 1' },
                  { value: 'partner', label: parents.partner.name || 'Rodzic 2' },
                ]}
                value={s.parent}
                onChange={(v) => update(i, { parent: v })}
              />
              <DateField label="Początek" value={s.start} onChange={(v) => update(i, { start: v ?? '' })} />
              <Stepper label="Tygodnie z puli" value={s.weeks} min={1} max={pool} onChange={(n) => update(i, { weeks: n })} />
              <View className="gap-2">
                <AppText variant="bodyStrong">Praca w trakcie urlopu</AppText>
                <SegmentedControl<string>
                  accessibilityLabel="Praca w trakcie urlopu"
                  segments={WORK.map((w) => ({ value: w.value, label: w.label }))}
                  value={String(s.workFraction)}
                  onChange={(v) => update(i, { workFraction: Number(v), workDuringExtension: Number(v) > 0 ? s.workDuringExtension : false })}
                />
              </View>
              {s.workFraction > 0 ? (
                <ToggleRow label="Pracuję także w okresie wydłużenia" hint="Wtedy urlop wydłuża się bardziej, a zasiłek przez cały czas jest pomniejszony." value={s.workDuringExtension} onChange={(v) => update(i, { workDuringExtension: v })} />
              ) : null}
              <ToggleRow label={`To część nieprzenoszalna (${p.parentalNonTransferableWeeks} tyg.)`} value={s.reserved} onChange={(v) => update(i, { reserved: v })} />
            </Card>
          ))}
          <Button label="Dodaj część urlopu" icon="add" variant="secondary" onPress={addSegment} disabled={segments.length >= p.parentalMaxParts || !earliest} />

          {blocking.length ? (
            <Alert tone="error" title="Popraw plan">
              {blocking.join('\n')}
            </Alert>
          ) : null}
          {warnings.length ? <Alert tone="warning">{warnings.join('\n')}</Alert> : null}

          {result.valid && result.periods.length ? (
            <>
              <View className="flex-row flex-wrap gap-3">
                <StatTile emphasis label="Łącznie dla rodziny" value={formatMoney(result.totalCents / 100, 0)} hint="zasiłek za cały rodzicielski" />
                <StatTile label="Pula" value={`${result.usedWeeks} z ${result.poolWeeks} tyg.`} hint={result.unusedWeeks ? `${result.unusedWeeks} tyg. niewykorzystane` : 'cała pula wykorzystana'} />
                <StatTile label="Razem w domu" value={`${result.simultaneousDays} dni`} hint="części jednoczesne" />
              </View>
              <Card className="gap-1 p-5">
                <AppText variant="heading" className="mb-2">
                  Harmonogram i wypłaty
                </AppText>
                {result.periods.map((x) => (
                  <View key={x.id} className="gap-0.5 border-b border-base-300 py-3">
                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <AppText variant="bodyStrong">{x.parent === 'me' ? parents.me.name : parents.partner.name}</AppText>
                      <AppText variant="bodyStrong">{money(x.totalCents)}</AppText>
                    </View>
                    <AppText variant="small" tone="muted">
                      {isoToPolishDate(x.start)} – {isoToPolishDate(x.end)} · {x.days} dni{x.extensionDays ? ` (w tym wydłużenie ${x.extensionDays} dni)` : ''}
                    </AppText>
                    <AppText variant="small" tone="muted">
                      {formatMoney(x.dailyCents / 100)} dziennie{x.workFraction ? ` · praca ${x.workFraction === 0.5 ? '½' : '¼'} etatu` : ''} · powrót do pracy {isoToPolishDate(x.returnDate)}
                    </AppText>
                  </View>
                ))}
                <View className="flex-row flex-wrap justify-between gap-2 pt-3">
                  <AppText>
                    {parents.me.name}: {money(result.totalByParent.me)}
                  </AppText>
                  <AppText>
                    {parents.partner.name}: {money(result.totalByParent.partner)}
                  </AppText>
                </View>
              </Card>
            </>
          ) : null}
          <AppText variant="small" tone="muted">
            Stawka {Math.round(p.rates.parental * 100)}% podstawy · zasady {result.rulesVersion}. To szacunek, nie decyzja ZUS ani pracodawcy. Łączenie z pracą wymaga wniosku do
            pracodawcy, który udziela urlopu.
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

export function FamilyPlanScreen() {
  const id = useProfileStore((s) => s.demoProfileId ?? s.profile?.me.id);
  return <Planner key={id} />;
}
