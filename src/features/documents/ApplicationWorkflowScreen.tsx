import { useState } from 'react';
import { View } from 'react-native';
import { useApplicationStore } from '@/core/applications/application.store';
import { evaluateApplication } from '@/core/applications/engine';
import { zamSections } from '@/core/applications/forms/zamFields';
import { type BenefitFacts, type CaseDocument } from '@/core/applications/model';
import { applicationOwner, changeDraft, markPdfReady, newApplication, submitSimulation, validateDraft } from '@/core/applications/workflow';
import { getToday } from '@/core/clock/clock';
import { offlineSnapshot } from '@/core/demo/DemoDataProvider';
import { goToOnboardingStep, goToCalculator } from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import type { Profile } from '@/core/types';
import { formatTime, isoToPolishDate, toISODate } from '@/shared/lib/date';
import { AppText, Button, Card, DateField, Screen, Select, TextField, ToggleRow } from '@/shared/ui';
import { CaseWorkbench } from './components/CaseWorkbench';
import { ApplicationPdf } from './components/ApplicationPdf';

const steps = ['Dane ZUS', 'Analiza PDF', 'Prawo i kwota', 'Formularz', 'PDF i złożenie', 'Moje wnioski'];
const kinds: { value: BenefitFacts['kind']; label: string }[] = [
  { value: 'maternity', label: 'Macierzyński' }, { value: 'parental', label: 'Rodzicielski' }, { value: 'paternity', label: 'Ojcowski' },
  { value: 'supplementary', label: 'Uzupełniający' }, { value: 'adoption', label: 'Adopcja' }, { value: 'foster', label: 'Rodzina zastępcza' },
  { value: 'pregnancy_sickness', label: 'Chorobowy w ciąży' }, { value: 'rehabilitation', label: 'Rehabilitacyjne' },
  { value: 'special_maternity', label: 'W wysokości macierzyńskiego' }, { value: 'care', label: 'Opiekuńczy' },
];
const statusText = { draft: 'Szkic', validated: 'Zweryfikowany', ready: 'Gotowy do symulacji', simulated_submitted: 'Złożono w symulacji – nie wysłano do urzędu' };
const money = (cents: number) => (cents / 100).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
const at = () => new Date().toISOString();

function Workflow({ profile, owner }: { profile: Profile; owner: string }) {
  const drafts = useApplicationStore((s) => s.drafts);
  const put = useApplicationStore((s) => s.put);
  const [active, setActive] = useState<string>(); const [step, setStep] = useState(0);
  const [message, setMessage] = useState(''); const [confirm, setConfirm] = useState(false);
  const [section, setSection] = useState(zamSections[0].title);
  const own = drafts.filter((d) => d.owner === owner);
  const draft = own.find((d) => d.id === active);
  const [childId, setChildId] = useState(profile.children[0].id);
  const create = () => {
    const child = profile.children.find((c) => c.id === childId)!;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    put(newApplication(profile, owner, child, toISODate(getToday()), id, at())); setActive(id); setStep(0); setMessage(''); setConfirm(false);
  };
  const change = (patch: Parameters<typeof changeDraft>[1]) => {
    if (!draft) return;
    try { put(changeDraft(draft, patch, at())); setConfirm(false); setMessage('Zapisano szkic na tym urządzeniu.'); }
    catch (e) { setMessage(String(e)); }
  };
  const facts = (patch: Partial<BenefitFacts>) => { if (draft) change({ facts: { ...draft.facts, ...patch, verified: false } }); };
  const applyCase = (doc: CaseDocument) => {
    if (!draft) return;
    const updated = { ...draft.facts, verified: false, baseConfirmed: false };
    for (const fact of doc.facts.filter((f) => f.reviewed && f.verificationStatus !== 'rejected')) {
      if (fact.key === 'baseGrossCents') updated.baseGrossCents = Number(fact.normalizedValue);
      else if (fact.key === 'eventDate' || fact.key === 'insuranceSince' || fact.key === 'insuranceUntil') updated[fact.key] = fact.normalizedValue;
      else if (fact.key === 'insurance' && ['yes', 'no', 'unknown'].includes(fact.normalizedValue)) updated.insurance = fact.normalizedValue as BenefitFacts['insurance'];
    }
    change({ facts: updated, caseId: doc.caseId, evidence: doc.facts }); setStep(2);
  };
  const result = draft ? evaluateApplication(draft.facts) : null;
  const readOnly = draft?.status === 'simulated_submitted';
  const zus = profile.me.work?.zus;
  const snapshot = /^P\d{2}$/.test(owner) ? offlineSnapshot(owner) : null;
  const next = () => { setStep(Math.min(step + 1, 5)); setMessage(''); };
  return <Screen keyboard>
    <Card tone="tinted"><AppText variant="title">Wniosek krok po kroku</AppText><AppText>SYMULACJA – DANE FIKCYJNE. Profil {owner}. Żadne dokumenty nie są wysyłane do urzędu.</AppText></Card>
    <View className="flex-row flex-wrap gap-2">{steps.map((title, i) => <Button key={title} compact variant={step === i ? 'primary' : 'secondary'} label={`${i + 1}. ${title}`} onPress={() => { setStep(i); setMessage(''); }} />)}</View>
    {!draft ? <Card><Select label="Dziecko / sprawa" value={childId} options={profile.children.map((c) => ({ value: c.id, label: c.name }))} onChange={(id) => { if (id) setChildId(id); }} /><Button label="Utwórz nowy wniosek" onPress={create} /><Button label="Pokaż moje wnioski" variant="secondary" onPress={() => setStep(5)} /></Card> : <Card><AppText>{draft.formId} · {statusText[draft.status]} · {draft.childId}</AppText><Button compact label="Nowy wniosek" variant="secondary" onPress={() => setActive(undefined)} /></Card>}
    {step === 0 ? <Card>
      <AppText variant="heading">Dane ZUS (symulacja)</AppText><AppText>Źródło: zapis aktywnego profilu {owner}; stan na {profile.updatedAt.slice(0, 10)}. Historia nie jest prognozą świadczenia.</AppText>
      <AppText>Ubezpieczenie chorobowe: {zus ? zus.sickness.insured ? 'tak' : 'nie' : 'brak danych'} · {zus?.sickness.kind} · {zus?.sickness.since} – {zus?.sickness.until ?? 'brak daty końca'}</AppText>
      <AppText>Płatnik: {zus?.payer.name ?? 'brak danych'}; wypłata: {profile.me.work?.benefitPayer ?? 'nie ustalono'}</AppText>
      <AppText>Zadłużenie: {zus ? money(Math.round(zus.arrears.amount * 100)) : 'brak danych'} · stan na {zus?.arrears.checkedAt ?? 'nie ustalono'}</AppText>
      <AppText variant="subheading">Historia podstaw (brutto)</AppText>{profile.me.work?.earnings.map((e) => <AppText key={e.month}>{e.month}: {money(Math.round(e.gross * 100))}</AppText>)}
      <AppText variant="subheading">Okresy ubezpieczenia i zatrudnienia</AppText>{zus?.periods.map((p, i) => <AppText key={i}>{p.kind}: {p.from} – {p.to ?? 'trwa'}</AppText>)}
      <AppText variant="subheading">Historia świadczeń</AppText>{zus?.benefitHistory.map((b, i) => <AppText key={i}>{b.kind}: {b.from} – {b.to} ({b.days} dni)</AppText>)}
      <AppText variant="subheading">e-ZLA (symulacja)</AppText>{snapshot?.ezla.length ? snapshot.ezla.map((r) => <AppText key={r.id}>{r.id}: {r.from} – {r.to}, kod {r.code}. {r.source}, stan na {r.asOf}</AppText>) : <AppText>Brak e-ZLA w tym scenariuszu.</AppText>}
      {snapshot?.hospitalizations.map((h) => <AppText key={h.childId}>Szpital — {h.childId}: {h.from} – {h.to}, {h.birthWeightGrams} g, tydzień {h.gestationalWeek}. {h.source}, stan na {h.asOf}</AppText>)}
      {snapshot?.civilRegistry.map((r) => <AppText key={r.childId}>USC — {r.recordId}: {r.birthDate}, {r.office}. Stan na {r.asOf}</AppText>)}
      {snapshot?.placement ? <AppText>Przyjęcie dziecka: {snapshot.placement.kind}, {snapshot.placement.date}; odroczenie szkolne: {snapshot.placement.schoolDeferral ? 'tak' : 'nie'}.</AppText> : null}
      {snapshot?.zaZyciem ? <AppText>Zaświadczenie „Za życiem”: {snapshot.zaZyciem.childId}, {snapshot.zaZyciem.issuedOn} (fikcyjne).</AppText> : null}
      <Button label="Przejdź do analizy dokumentu" disabled={!draft} onPress={next} />
    </Card> : null}
    {step === 1 && draft && !readOnly ? <><CaseWorkbench key={draft.id} draft={draft} onCase={applyCase} /><Button label="Wprowadź dane ręcznie" onPress={next} /></> : null}
    {step === 2 && draft ? <>
      {!readOnly ? <Card>
        <Select label="Świadczenie" value={draft.facts.kind} options={kinds} onChange={(kind) => { if (kind) facts({ kind }); }} />
        <AppText>Źródło pól: profil / potwierdzony odczyt / wpis ręczny. Sprawdź okres i indywidualną podstawę.</AppText>
        {(['eventDate', 'start', 'end', 'applicationDate'] as const).map((key, i) => <DateField key={key} label={['Data zdarzenia', 'Początek okresu', 'Koniec okresu', 'Data wniosku'][i]} value={draft.facts[key]} onChange={(value) => facts({ [key]: value ?? '' })} />)}
        <Select label="Ubezpieczenie na dzień powstania prawa" value={draft.facts.insurance} options={[{ value: 'yes', label: 'Tak' }, { value: 'no', label: 'Nie' }, { value: 'unknown', label: 'Nie ustalono' }]} onChange={(insurance) => { if (insurance) facts({ insurance }); }} />
        <DateField label="Ubezpieczenie od" value={draft.facts.insuranceSince} onChange={(v) => facts({ insuranceSince: v ?? '' })} />
        <DateField label="Ubezpieczenie do (brak = trwa)" value={draft.facts.insuranceUntil} onChange={(v) => facts({ insuranceUntil: v ?? '' })} />
        <TextField label="Średnia podstawa brutto przed odliczeniem 13,71% (zł)" keyboardType="decimal-pad" value={String(draft.facts.baseGrossCents / 100)} onChangeText={(v) => { const n = Number(v.replace(',', '.')); if (Number.isFinite(n) && n >= 0) facts({ baseGrossCents: Math.round(n * 100), baseConfirmed: false }); }} />
        <ToggleRow label="Potwierdzam podstawę i kompletność miesięcy" value={draft.facts.baseConfirmed} onChange={(v) => facts({ baseConfirmed: v })} />
        <ToggleRow label="Wniosek o wariant 81,5% (termin 21 dni zostanie sprawdzony)" value={draft.facts.upfront} onChange={(v) => facts({ upfront: v })} />
        <ToggleRow label="Nieprzenoszalne 9 tygodni rodzicielskiego (70%)" value={draft.facts.reserved} onChange={(v) => facts({ reserved: v })} />
        <TextField label="Numer części urlopu" value={String(draft.facts.part)} keyboardType="number-pad" onChangeText={(v) => { if (/^\d+$/.test(v)) facts({ part: Number(v) }); }} />
        <ToggleRow label="Zaświadczenie Za życiem" value={draft.facts.zaZyciem} onChange={(v) => facts({ zaZyciem: v })} />
        <ToggleRow label="Spór o podleganie ubezpieczeniu" value={draft.facts.disputedInsurance} onChange={(v) => facts({ disputedInsurance: v })} />
        {draft.facts.employment === 'self_employed' ? <><TextField label="Dług składkowy (zł)" value={String(draft.facts.debtCents / 100)} onChangeText={(v) => { const n = Number(v.replace(',', '.')); if (Number.isFinite(n) && n >= 0) facts({ debtCents: Math.round(n * 100) }); }} /><DateField label="Stan zadłużenia na dzień" value={draft.facts.debtAsOf} onChange={(v) => facts({ debtAsOf: v ?? '' })} /><ToggleRow label="Układ ratalny wykonywany terminowo, brak innych zaległości" value={draft.facts.debtArrangementCurrent} onChange={(v) => facts({ debtArrangementCurrent: v })} /></> : null}
        <ToggleRow label="Potwierdzam fakty po sprawdzeniu źródeł" value={draft.facts.verified} onChange={(verified) => change({ facts: { ...draft.facts, verified } })} />
      </Card> : null}
      <Card><AppText variant="heading">{result?.status === 'eligible' ? 'Warunki symulacji spełnione' : result?.status === 'ineligible' ? 'Brak prawa w podanym zakresie' : 'Wymaga uzupełnienia lub weryfikacji'}</AppText>{result?.reasons.map((r) => <AppText key={r}>{r}</AppText>)}{result?.missing.map((m) => <AppText key={m}>Brakuje: {m}</AppText>)}
        {result?.amount ? <><AppText>Podstawa po odliczeniu: {money(result.amount.baseCents)} · stawka: {result.amount.rate * 100}%</AppText><AppText>Dziennie: {money(result.amount.dailyCents)} · szacunek za 30 dni: {money(result.amount.estimate30Cents)}</AppText><AppText variant="heading">Za {result.amount.days} dni: {money(result.amount.totalCents)}</AppText></> : null}
        <AppText variant="small">{result?.reasonCode} · {result?.rulesVersion} · {result?.effectiveDate}</AppText><Button label="Otwórz kalkulator planu urlopów" variant="secondary" onPress={goToCalculator} /><Button label="Przejdź do formularza" onPress={next} />
      </Card>
    </> : null}
    {step === 3 && draft ? <Card>
      <Select label="Rodzaj formularza" value={draft.formId} options={[{ value: 'ZAM', label: 'ZAM – wzór od 24.10.2026' }]} onChange={(formId) => { if (formId && !readOnly) change({ formId, recipient: formId === 'USC' ? 'usc' : formId === 'EMPLOYER' ? 'employer' : draft.recipient }); }} />
      <Select label="Odbiorca" value={draft.recipient} options={[{ value: 'zus', label: 'ZUS (DEMO)' }, { value: 'employer', label: 'Pracodawca / płatnik (DEMO)' }, { value: 'usc', label: 'USC (DEMO)' }, { value: 'unknown', label: 'Nie ustalono' }]} onChange={(recipient) => { if (recipient && !readOnly) change({ recipient }); }} />
      <AppText>Pracownik przekazuje dokumenty pracodawcy. Z-3/Z-3a wystawia płatnik. Zakres załączników zależy od sytuacji; nie zastępuj ich własnym oświadczeniem.</AppText>
      <Select label="Sekcja formularza" value={section} options={zamSections.map((s) => ({ value: s.title, label: s.title }))} onChange={(v) => { if (v) setSection(v); }} />
      {zamSections.find((s) => s.title === section)?.fields.map((field) => field.type === 'check' ? <ToggleRow key={field.id} label={field.label} value={!!draft.values[field.id]} onChange={(v) => { if (!readOnly) change({ values: { ...draft.values, [field.id]: v ? '1' : undefined } }); }} /> : <TextField key={field.id} label={field.label} editable={!readOnly} value={draft.values[field.id] ?? ''} onChangeText={(v) => change({ values: { ...draft.values, [field.id]: v } })} />)}
      <AppText>Okres i rodzaj urlopu zostaną przeniesione z oceny przy walidacji. Brakujących danych dziecka nie uzupełniamy domysłami.</AppText>
      <ToggleRow label="Sprawdziłem wymagane dane dziecka i dokumenty (DEMO)" value={draft.attachmentsConfirmed} onChange={(v) => { if (!readOnly) change({ attachmentsConfirmed: v }); }} />
      <ToggleRow label="Potwierdzam dane i podpis wyłącznie w symulacji" value={draft.signatureConfirmed} onChange={(v) => { if (!readOnly) change({ signatureConfirmed: v }); }} />
      <Button label="Zweryfikuj formularz" disabled={readOnly} onPress={() => { try { put(validateDraft(draft, at())); setStep(4); setMessage('Walidacja poprawna. Wygeneruj PDF i sprawdź odbiorcę.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Błąd walidacji'); } }} />
    </Card> : null}
    {step === 4 && draft ? <Card><AppText variant="heading">Przegląd przed symulacją</AppText><AppText>Odbiorca: {draft.recipient} · {draft.formId} · {isoToPolishDate(draft.facts.start)} – {isoToPolishDate(draft.facts.end)}</AppText>
      <ApplicationPdf key={`${draft.id}-${draft.updatedAt}`} draft={draft} onReady={(revision) => { const latest = useApplicationStore.getState().drafts.find((d) => d.id === draft.id); if (latest) try { put(markPdfReady(latest, revision, at())); } catch (e) { setMessage(String(e)); } }} />
      {!readOnly ? <><ToggleRow label="Sprawdziłem PDF i odbiorcę. Potwierdzam wyłącznie symulację." value={confirm} onChange={setConfirm} /><Button label="Złóż w symulacji" disabled={draft.status !== 'ready' || !confirm} onPress={() => { try { put(submitSimulation(draft, owner, confirm, at())); setStep(5); setConfirm(false); setMessage('Złożono w symulacji – nie wysłano do urzędu.'); } catch (e) { setMessage(String(e)); } }} /><Button label="Anuluj i wróć do szkicu" variant="secondary" onPress={() => { change({}); setStep(3); }} /></> : <AppText>{draft.submissionId} · {statusText[draft.status]}</AppText>}
    </Card> : null}
    {step === 5 ? <Card><AppText variant="heading">Moje wnioski — {owner}</AppText>{own.length === 0 ? <AppText>Brak zapisanych wniosków.</AppText> : own.map((d) => <View key={d.id} className="gap-2 border-b border-base-300 py-3"><AppText>{d.formId} · {isoToPolishDate(d.facts.start)} · {statusText[d.status]}</AppText><AppText>{d.submissionId ?? d.id}</AppText><Button label="Otwórz zapisany wniosek" variant="secondary" onPress={() => { setActive(d.id); setStep(d.status === 'draft' ? 3 : 4); setConfirm(false); }} />{d.history.map((h, i) => <AppText variant="small" key={i}>{formatTime(h.at)} — {h.action}</AppText>)}</View>)}</Card> : null}
    {message ? <Card><AppText accessibilityLiveRegion="polite">{message}</AppText></Card> : null}
  </Screen>;
}
export function ApplicationWorkflowScreen() {
  const profile = useProfileStore((s) => s.profile); const demoId = useProfileStore((s) => s.demoProfileId);
  if (!profile) return <Screen><AppText>Zaloguj się w DEMO lub utwórz profil ręczny.</AppText><Button label="Przejdź do logowania" onPress={() => goToOnboardingStep('login')} /></Screen>;
  const owner = applicationOwner(profile, demoId);
  return <Workflow key={owner} profile={profile} owner={owner} />;
}
