import { useState } from 'react';
import { View } from 'react-native';
import { calculateFamilyLeavePlan, type FamilyLeavePlan } from '@/core/benefits/familyLeavePlan';
import { useProfileStore } from '@/core/profile/profile.store';
import { AppText, Button, Card, DateField, Screen, Select, TextField, ToggleRow } from '@/shared/ui';

function Planner() {
  const p = useProfileStore((s) => s.profile);
  const child = p?.children[0];
  const [plan, setPlan] = useState<FamilyLeavePlan>({
    childBirthDate: child?.birthDate ?? child?.dueDate ?? '2026-11-01', childrenCount: child?.multipleBirthGroupId ? p!.children.filter((c) => c.multipleBirthGroupId === child.multipleBirthGroupId).length : 1,
    zaZyciem: false, parents: { me: { baseCents: Math.round((p?.me.work?.monthlyGross ?? 0) * 86.29), eligible: false }, partner: { baseCents: Math.round((p?.partner?.work?.monthlyGross ?? 0) * 86.29), eligible: false } }, segments: [],
  });
  const result = calculateFamilyLeavePlan(plan);
  const update = (i: number, patch: Partial<FamilyLeavePlan['segments'][number]>) => setPlan({ ...plan, segments: plan.segments.map((s, n) => n === i ? { ...s, ...patch } : s) });
  return <Screen><Card><AppText variant="title">Rodzicielski dla obojga rodziców</AppText><AppText>SYMULACJA – DANE FIKCYJNE. Plan liczy wariant 70%, osobne podstawy i łączenie z pracą. Prawo każdego rodzica wymaga oddzielnego potwierdzenia.</AppText>
    <DateField label="Data urodzenia dziecka" value={plan.childBirthDate} onChange={(v) => setPlan({ ...plan, childBirthDate: v ?? '' })} />
    <ToggleRow label="Zaświadczenie Za życiem" value={plan.zaZyciem} onChange={(v) => setPlan({ ...plan, zaZyciem: v })} />
    {(['me', 'partner'] as const).map((who, i) => <View key={who} className="gap-2"><TextField label={`Podstawa zasiłku po odliczeniu składek — rodzic ${i + 1} (zł)`} value={String(plan.parents[who].baseCents / 100)} keyboardType="decimal-pad" onChangeText={(v) => { const n = Number(v.replace(',', '.')); if (Number.isFinite(n)) setPlan({ ...plan, parents: { ...plan.parents, [who]: { ...plan.parents[who], baseCents: Math.round(n * 100) } } }); }} /><ToggleRow label={`Potwierdzono prawo rodzica ${i + 1}`} value={plan.parents[who].eligible} onChange={(v) => setPlan({ ...plan, parents: { ...plan.parents, [who]: { ...plan.parents[who], eligible: v } } })} /></View>)}
  </Card>
    {plan.segments.map((s, i) => <Card key={s.id}><AppText variant="heading">Część {i + 1}</AppText><Select label="Rodzic" value={s.parent} options={[{ value: 'me', label: 'Rodzic 1' }, { value: 'partner', label: 'Rodzic 2' }]} onChange={(v) => { if (v) update(i, { parent: v }); }} /><DateField label="Początek" value={s.start} onChange={(v) => update(i, { start: v ?? '' })} /><TextField label="Tygodnie z podstawowej puli" value={String(s.weeks)} keyboardType="number-pad" onChangeText={(v) => update(i, { weeks: Number(v) })} /><TextField label="Wymiar pracy (0–0,5 etatu)" value={String(s.workFraction)} keyboardType="decimal-pad" onChangeText={(v) => update(i, { workFraction: Number(v.replace(',', '.')) })} /><ToggleRow label="Praca także w okresie wydłużenia" value={s.workDuringExtension} onChange={(v) => update(i, { workDuringExtension: v })} /><ToggleRow label="Część nieprzenoszalna" value={s.reserved} onChange={(v) => update(i, { reserved: v })} /><Button label="Usuń tę część planu" variant="secondary" onPress={() => setPlan({ ...plan, segments: plan.segments.filter((_, n) => n !== i) })} /></Card>)}
    <Button label="Dodaj część urlopu" disabled={plan.segments.length >= 6} onPress={() => setPlan({ ...plan, segments: [...plan.segments, { id: `${Date.now()}`, parent: plan.segments.length ? 'partner' : 'me', start: plan.childBirthDate, weeks: 9, workFraction: 0, workDuringExtension: false, reserved: true }] })} />
    <Card><AppText variant="heading">Harmonogram i wypłaty</AppText>{result.issues.map((r, i) => <AppText key={i} tone="danger">{r}</AppText>)}{result.valid ? <><AppText>Pula: {result.poolWeeks} tyg.; niewykorzystane: {result.unusedWeeks} tyg.; jednocześnie: {result.simultaneousDays} dni.</AppText>{result.periods.map((s) => <AppText key={s.id}>{s.parent === 'me' ? 'Rodzic 1' : 'Rodzic 2'}: {s.start} – {s.end}; {s.days} dni (wydłużenie {s.extensionDays}); {(s.totalCents / 100).toFixed(2)} zł. Powrót: {s.returnDate}.</AppText>)}<AppText>Łącznie: {(result.totalCents / 100).toFixed(2)} zł</AppText></> : null}</Card>
  </Screen>;
}
export function FamilyPlanScreen() { const id = useProfileStore((s) => s.demoProfileId ?? s.profile?.me.id); return <Planner key={id} />; }
