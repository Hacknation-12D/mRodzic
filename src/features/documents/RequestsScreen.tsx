import { useState } from 'react';
import { View } from 'react-native';

import { addDateDays } from '@/core/applications/engine';
import { getToday } from '@/core/clock/clock';
import { legal, maternityWeeksFor } from '@/core/legal/parameters';
import { useProfileStore } from '@/core/profile/profile.store';
import {
  checkCivilCopy,
  checkLeaveRequest,
  CIVIL_COPY_LABELS,
  CIVIL_DELIVERY_LABELS,
  civilCopyFee,
  civilCopyText,
  contributionStatement,
  contributionStatementText,
  LEAVE_REQUESTS,
  leaveRequestText,
  type CivilCopyKind,
  type CivilDelivery,
  type LeaveRequestKind,
  type RequestCheck,
} from '@/core/requests/requests';
import { useRequestsStore } from '@/core/requests/requests.store';
import type { Profile } from '@/core/types';
import { formatTime, isoToPolishDate, toISODate } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { openExternalLink } from '@/shared/lib/links';
import { Alert, AppText, Button, Card, DateField, IconBadge, Screen, SectionHeader, SegmentedControl, Select, Stepper, TextField } from '@/shared/ui';

import { downloadTextPdf } from './requestPdf';

type Tab = 'leave' | 'usc' | 'zus';
const KINDS = Object.values(LEAVE_REQUESTS);
const USC_URL = 'https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-urodzenia';

/** Wspólne: wynik walidacji + PDF + symulowana wysyłka. */
function Actions({ check, onPdf, onSend, sendLabel }: { check: RequestCheck; onPdf: () => Promise<void>; onSend: () => void; sendLabel: string }) {
  const [message, setMessage] = useState('');
  return (
    <View className="gap-3">
      {check.errors.length ? (
        <Alert tone="error" title="Uzupełnij wniosek">
          {check.errors.join('\n')}
        </Alert>
      ) : null}
      {check.warnings.length ? <Alert tone="warning">{check.warnings.join('\n')}</Alert> : null}
      <View className="flex-row flex-wrap gap-3">
        <Button
          label="Pobierz PDF"
          icon="download-outline"
          variant="secondary"
          disabled={check.errors.length > 0}
          className="min-w-48 flex-1"
          onPress={() => void onPdf().then(() => setMessage('Pobrano PDF.')).catch((e: unknown) => setMessage(e instanceof Error ? e.message : 'Nie udało się utworzyć PDF.'))}
        />
        <Button
          label={sendLabel}
          icon="send-outline"
          disabled={check.errors.length > 0}
          className="min-w-48 flex-1"
          onPress={() => {
            onSend();
            setMessage('Wysłano w symulacji – dokument nie opuścił urządzenia. Historię znajdziesz poniżej.');
          }}
        />
      </View>
      {message ? <AppText accessibilityLiveRegion="polite">{message}</AppText> : null}
    </View>
  );
}

function childOptions(profile: Profile) {
  return profile.children.filter((c) => !c.loss || c.loss.kind !== 'death').map((c) => ({ value: c.id, label: c.name }));
}

function LeaveForm({ profile, owner }: { profile: Profile; owner: string }) {
  const today = toISODate(getToday());
  const add = useRequestsStore((s) => s.add);
  const [kind, setKind] = useState<LeaveRequestKind>(profile.me.gender === 'male' ? 'paternity' : 'maternity_parental');
  const [childId, setChildId] = useState(profile.children[0]?.id ?? '');
  const child = profile.children.find((c) => c.id === childId);
  const birth = child?.birthDate ?? child?.dueDate ?? today;
  const defaults = (() => {
    const p = legal();
    const mat = maternityWeeksFor(1) * 7;
    const ranges: Record<LeaveRequestKind, [string, string]> = {
      maternity: [birth, addDateDays(birth, mat - 1)],
      maternity_parental: [birth, addDateDays(birth, (maternityWeeksFor(1) + p.parentalWeeks.single - p.parentalNonTransferableWeeks) * 7 - 1)],
      parental: [addDateDays(birth, mat), addDateDays(birth, mat + 9 * 7 - 1)],
      parental_work: [addDateDays(birth, mat), addDateDays(birth, mat + 16 * 7 - 1)],
      paternity: [addDateDays(today, 14), addDateDays(today, 27)],
      maternity_resignation: [addDateDays(birth, 14 * 7), addDateDays(birth, mat - 1)],
      maternity_takeover: [addDateDays(birth, 14 * 7), addDateDays(birth, mat - 1)],
    };
    return ranges;
  })();
  const [start, setStart] = useState(defaults[kind][0]);
  const [end, setEnd] = useState(defaults[kind][1]);
  const [part, setPart] = useState(1);
  const [work, setWork] = useState('0.5');
  const [employer, setEmployer] = useState(profile.me.work?.zus?.payer.name ?? '');
  const [position, setPosition] = useState('');
  const other = profile.partner ? `${profile.partner.firstName}${profile.partner.lastName ? ` ${profile.partner.lastName}` : ''}` : '';

  const def = LEAVE_REQUESTS[kind];
  const input = {
    kind,
    applicant: { firstName: profile.me.firstName, lastName: profile.me.lastName ?? '', position },
    employer: { name: employer, city: profile.me.work?.zus?.payer.city },
    child: { name: child?.name ?? '', birthDate: child?.birthDate, dueDate: child?.dueDate },
    start,
    end,
    part,
    workFraction: Number(work),
    otherParent: other ? { name: other } : undefined,
    submittedOn: today,
  };
  const check = checkLeaveRequest(input);
  const choose = (k: LeaveRequestKind) => {
    setKind(k);
    setStart(defaults[k][0]);
    setEnd(defaults[k][1]);
  };

  return (
    <Card className="gap-4 p-5">
      <Select label="Rodzaj wniosku" value={kind} options={KINDS.map((k) => ({ value: k.kind, label: k.title }))} onChange={(v) => v && choose(v)} />
      <Alert tone="info" title="Termin złożenia">
        {`${def.deadlineText}${check.latestSubmission ? `\nNajpóźniej: ${isoToPolishDate(check.latestSubmission)}.` : ''}`}
      </Alert>
      {profile.children.length > 1 ? <Select label="Dziecko" value={childId} options={childOptions(profile)} onChange={(v) => v && setChildId(v)} /> : null}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-48 flex-1">
          <TextField label="Pracodawca" value={employer} onChangeText={setEmployer} />
        </View>
        <View className="min-w-48 flex-1">
          <TextField label="Stanowisko (opcjonalnie)" value={position} onChangeText={setPosition} />
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-48 flex-1">
          <DateField label="Od" value={start} onChange={(v) => setStart(v ?? '')} />
        </View>
        <View className="min-w-48 flex-1">
          <DateField label="Do" value={end} onChange={(v) => setEnd(v ?? '')} />
        </View>
      </View>
      {def.part ? <Stepper label="Która to część urlopu" value={part} min={1} max={5} onChange={setPart} /> : null}
      {def.work ? (
        <View className="gap-2">
          <AppText variant="bodyStrong">Wymiar pracy w trakcie urlopu</AppText>
          <SegmentedControl<string>
            accessibilityLabel="Wymiar pracy"
            segments={[
              { value: '0.25', label: '¼ etatu' },
              { value: '0.5', label: '½ etatu' },
            ]}
            value={work}
            onChange={setWork}
          />
        </View>
      ) : null}
      <View className="gap-1">
        <AppText variant="bodyStrong">Załączniki</AppText>
        {def.attachments.map((a) => (
          <AppText key={a} variant="small">
            • {a}
          </AppText>
        ))}
      </View>
      <Actions
        check={check}
        sendLabel="Wyślij do pracodawcy (symulacja)"
        onPdf={async () => {
          const doc = leaveRequestText(input);
          await downloadTextPdf(doc.title, doc.sections, `wniosek-${kind}.pdf`);
        }}
        onSend={() =>
          add({ id: `${Date.now()}`, owner, title: def.title, recipient: 'employer', sentAt: new Date().toISOString(), summary: `${isoToPolishDate(start)} – ${isoToPolishDate(end)} · ${employer}` })
        }
      />
    </Card>
  );
}

function UscForm({ profile, owner }: { profile: Profile; owner: string }) {
  const add = useRequestsStore((s) => s.add);
  const born = profile.children.filter((c) => c.status === 'born');
  const [childId, setChildId] = useState(born[0]?.id ?? '');
  const child = born.find((c) => c.id === childId);
  const [kind, setKind] = useState<CivilCopyKind>('short');
  const [delivery, setDelivery] = useState<CivilDelivery>('online');
  const [copies, setCopies] = useState(1);
  const [purpose, setPurpose] = useState('');
  if (!child) return <Card className="p-5"><AppText>Odpis aktu urodzenia można zamówić po urodzeniu dziecka i rejestracji w USC.</AppText></Card>;
  const input = {
    kind,
    copies,
    delivery,
    child: { name: child.name, lastName: profile.me.lastName, birthDate: child.birthDate, actNumber: child.birthRegistry?.actNumber, office: child.birthRegistry?.office },
    applicant: { firstName: profile.me.firstName, lastName: profile.me.lastName ?? '', relation: 'parent' as const },
    purpose,
    submittedOn: toISODate(getToday()),
  };
  const check = checkCivilCopy(input);
  return (
    <Card className="gap-4 p-5">
      {born.length > 1 ? <Select label="Dziecko" value={childId} options={born.map((c) => ({ value: c.id, label: c.name }))} onChange={(v) => v && setChildId(v)} /> : null}
      <AppText tone="muted">
        Akt urodzenia: {child.birthRegistry ? `${child.birthRegistry.actNumber}, ${child.birthRegistry.office}` : 'brak numeru w profilu – urząd odnajdzie akt po danych dziecka'}.
      </AppText>
      <Select label="Rodzaj odpisu" value={kind} options={(Object.keys(CIVIL_COPY_LABELS) as CivilCopyKind[]).map((k) => ({ value: k, label: CIVIL_COPY_LABELS[k] }))} onChange={(v) => v && setKind(v)} />
      <Select label="Sposób odbioru" value={delivery} options={(Object.keys(CIVIL_DELIVERY_LABELS) as CivilDelivery[]).map((k) => ({ value: k, label: CIVIL_DELIVERY_LABELS[k] }))} onChange={(v) => v && setDelivery(v)} />
      <Stepper label="Liczba odpisów" value={copies} min={1} max={10} onChange={setCopies} />
      <TextField label="Cel (opcjonalnie)" value={purpose} onChangeText={setPurpose} hint="Np. paszport, zasiłek, sprawa sądowa." />
      <AppText variant="bodyStrong">Opłata skarbowa: {formatMoney(civilCopyFee(input), 0)}</AppText>
      <AppText variant="small" tone="muted">
        Pierwszy odpis skrócony otrzymujesz bez opłaty przy rejestracji urodzenia. Stawki sprawdź przed złożeniem na gov.pl.
      </AppText>
      <Actions
        check={check}
        sendLabel="Złóż wniosek do USC (symulacja)"
        onPdf={async () => {
          const doc = civilCopyText(input);
          await downloadTextPdf(doc.title, doc.sections, 'wniosek-odpis-aktu-urodzenia.pdf');
        }}
        onSend={() => add({ id: `${Date.now()}`, owner, title: `${CIVIL_COPY_LABELS[kind]} aktu urodzenia – ${child.name}`, recipient: 'usc', sentAt: new Date().toISOString(), summary: `${copies} szt. · ${CIVIL_DELIVERY_LABELS[delivery]}` })}
      />
      <Button label="Złóż prawdziwy wniosek na gov.pl" icon="open-outline" variant="ghost" onPress={() => void openExternalLink(USC_URL)} />
    </Card>
  );
}

function ZusForm({ profile, owner }: { profile: Profile; owner: string }) {
  const add = useRequestsStore((s) => s.add);
  const zus = profile.me.work?.zus;
  if (!zus) return <Card className="p-5"><AppText>Brak danych z PUE/eZUS w profilu. Zaloguj się profilem DEMO, aby zobaczyć stan rozliczeń.</AppText></Card>;
  const statement = contributionStatement({
    person: `${profile.me.firstName} ${profile.me.lastName ?? ''}`.trim(),
    payer: zus.payer.name,
    nip: zus.payer.nip,
    asOf: zus.arrears.checkedAt,
    arrears: zus.arrears.amount,
    selfEmployed: profile.me.employment === 'self_employed',
  });
  return (
    <Card className="gap-4 p-5">
      <AppText>
        Stan rozliczeń składek na dzień powstania prawa do zasiłku jest kluczowy przy działalności gospodarczej: zadłużenie ponad {formatMoney(statement.threshold)} wstrzymuje wypłatę zasiłku do czasu spłaty.
      </AppText>
      <Alert tone={statement.blocksBenefit ? 'error' : statement.arrears > 0 ? 'warning' : 'success'} title={`Stan na ${isoToPolishDate(statement.asOf)}`}>
        {statement.text}
      </Alert>
      <Actions
        check={{ errors: [], warnings: [] }}
        sendLabel="Wystaw zaświadczenie w PUE (symulacja)"
        onPdf={async () => {
          const doc = contributionStatementText(statement);
          await downloadTextPdf(doc.title, doc.sections, 'zaswiadczenie-stan-rozliczen.pdf');
        }}
        onSend={() => add({ id: `${Date.now()}`, owner, title: 'Zaświadczenie o stanie rozliczeń', recipient: 'zus', sentAt: new Date().toISOString(), summary: statement.arrears > 0 ? `Zadłużenie ${formatMoney(statement.arrears)}` : 'Brak zaległości' })}
      />
    </Card>
  );
}

/** Wnioski do pracodawcy i USC oraz zaświadczenie z ZUS – wypełnienie z profilu, PDF, symulowana wysyłka, historia. */
export function RequestsScreen() {
  const profile = useProfileStore((s) => s.profile);
  const demoId = useProfileStore((s) => s.demoProfileId);
  const sent = useRequestsStore((s) => s.sent);
  const [tab, setTab] = useState<Tab>('leave');
  if (!profile) return <Screen><AppText>Zaloguj się w DEMO albo utwórz profil, aby przygotować wniosek.</AppText></Screen>;
  const owner = demoId ?? profile.me.id;
  const mine = sent.filter((r) => r.owner === owner);
  const RECIPIENT = { employer: 'Pracodawca', usc: 'USC', zus: 'ZUS' } as const;

  return (
    <Screen keyboard>
      <Card tone="tinted" elevation={0} className="gap-3 p-5">
        <View className="flex-row items-center gap-3">
          <IconBadge icon="create-outline" size={48} />
          <AppText variant="title" accessibilityRole="header" className="flex-1">
            Wnioski do pracodawcy i USC
          </AppText>
        </View>
        <AppText>
          Wnioski o urlopy składasz u pracodawcy – nie ma ich na zus.pl. Przygotujemy je z danych profilu, sprawdzimy terminy i limity, a Ty pobierzesz PDF do podpisu. Wnioski o zasiłek (ZAM)
          znajdziesz w „Wnioskach i danych ZUS”.
        </AppText>
      </Card>
      <SegmentedControl<Tab>
        accessibilityLabel="Rodzaj dokumentu"
        segments={[
          { value: 'leave', label: 'Urlop' },
          { value: 'usc', label: 'Odpis aktu' },
          { value: 'zus', label: 'Zaświadczenie ZUS' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'leave' ? <LeaveForm key={owner} profile={profile} owner={owner} /> : tab === 'usc' ? <UscForm key={owner} profile={profile} owner={owner} /> : <ZusForm profile={profile} owner={owner} />}

      <SectionHeader title="Wysłane w symulacji" />
      <Card className="gap-1 p-5">
        {mine.length === 0 ? <AppText tone="muted">Brak wysłanych wniosków.</AppText> : null}
        {mine.map((r) => (
          <View key={r.id} className="gap-0.5 border-b border-base-300 py-2">
            <AppText variant="bodyStrong">{r.title}</AppText>
            <AppText variant="small" tone="muted">
              {RECIPIENT[r.recipient]} · {formatTime(r.sentAt)} · {r.summary}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
