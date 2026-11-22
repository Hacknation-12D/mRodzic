import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useLegalStore } from '@/core/legal/legal.store';
import {
  consistencyIssues,
  DEFAULT_LEGAL_PARAMETERS,
  legal,
  LegalParametersSchema,
  minBenefitBase,
  netOfContributions,
  type LegalParameters,
} from '@/core/legal/parameters';
import { formatTime } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { Alert, AppText, Badge, Button, Card, IconBadge, Screen, SectionHeader, TextField } from '@/shared/ui';

import { fromText, getPath, GROUPS, setPath, toText, UNIT_LABEL, type FieldDef } from './fields';

/** Przykład do podglądu skutków zmiany: pracownik, 6000 zł brutto, jedno dziecko. */
const SAMPLE_GROSS = 6000;

function preview(p: LegalParameters) {
  const base = Math.max(netOfContributions(SAMPLE_GROSS, p), minBenefitBase(p));
  return {
    base,
    maternity: base * p.rates.full,
    parental: base * p.rates.parental,
    upfront: base * p.rates.upfront,
    maternityWeeks: p.maternityWeeks[0],
    parentalWeeks: p.parentalWeeks.single,
    total: (base / 30) * (p.maternityWeeks[0] * 7 * p.rates.full + (p.parentalWeeks.single - p.parentalNonTransferableWeeks) * 7 * p.rates.parental),
  };
}

type Texts = Record<string, string>;
const textsFor = (p: LegalParameters): Texts =>
  Object.fromEntries(GROUPS.flatMap((g) => g.fields).map((f) => [f.path, toText(getPath(p, f.path), f.unit)]));

const SOURCE_LABEL = { admin: 'panel', server: 'serwer', reset: 'przywrócenie', import: 'import JSON' } as const;

/** Panel administracyjny parametrów prawnych (zadanie ZUS: zmiana stóp, wymiarów i kwot bez nowej wersji aplikacji). */
export function AdminScreen() {
  const save = useLegalStore((s) => s.save);
  const reset = useLegalStore((s) => s.reset);
  const history = useLegalStore((s) => s.history);
  const revision = useLegalStore((s) => s.revision);
  // Aktywny zestaw odczytujemy po każdej zmianie (revision).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const active = useMemo(() => legal(), [revision]);

  const [meta, setMeta] = useState({ version: active.version, effectiveFrom: active.effectiveFrom, effectiveTo: active.effectiveTo, note: active.note });
  const [texts, setTexts] = useState<Texts>(() => textsFor(active));
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [json, setJson] = useState('');

  const load = (p: LegalParameters) => {
    setMeta({ version: p.version, effectiveFrom: p.effectiveFrom, effectiveTo: p.effectiveTo, note: p.note });
    setTexts(textsFor(p));
  };

  // Projekt z formularza + błędy pól.
  const { draft, fieldErrors } = useMemo(() => {
    let p: LegalParameters = { ...active, ...meta };
    const errors: Record<string, string> = {};
    for (const f of GROUPS.flatMap((g) => g.fields)) {
      const value = fromText(texts[f.path] ?? '', f.unit);
      if (Number.isNaN(value)) errors[f.path] = 'Wpisz liczbę.';
      else p = setPath(p, f.path, value);
    }
    const parsed = LegalParametersSchema.safeParse(p);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors[issue.path.join('.')] ??= issue.message;
    }
    return { draft: p, fieldErrors: errors };
  }, [active, meta, texts]);

  const changed = useMemo(
    () => GROUPS.flatMap((g) => g.fields).filter((f) => !fieldErrors[f.path] && getPath(draft, f.path) !== getPath(active, f.path)),
    [draft, active, fieldErrors],
  );
  const now = preview(active);
  const next = preview(draft);
  const problems = Object.keys(fieldErrors).length ? [] : consistencyIssues(draft);

  const onSave = () => {
    if (Object.keys(fieldErrors).length) return setMessage({ tone: 'error', text: 'Popraw zaznaczone pola.' });
    if (meta.version === active.version && changed.length) {
      return setMessage({ tone: 'error', text: 'Zmień numer wersji – każdy zestaw parametrów musi mieć własny identyfikator.' });
    }
    const errors = save(draft);
    setMessage(errors.length ? { tone: 'error', text: errors.join('\n') } : { tone: 'success', text: `Zapisano wersję ${draft.version}. Kalkulatory liczą już według nowych parametrów.` });
  };

  const onReset = () => {
    reset();
    load(DEFAULT_LEGAL_PARAMETERS);
    setMessage({ tone: 'success', text: 'Przywrócono wartości domyślne 2026.' });
  };

  const onImport = () => {
    try {
      const errors = save(JSON.parse(json), 'import');
      if (errors.length) return setMessage({ tone: 'error', text: errors.join('\n') });
      load(legal());
      setMessage({ tone: 'success', text: 'Zaimportowano zestaw parametrów.' });
    } catch {
      setMessage({ tone: 'error', text: 'To nie jest poprawny JSON.' });
    }
  };

  const field = (f: FieldDef) => (
    <View key={f.path} className="min-w-64 flex-1">
      <TextField
        label={`${f.label}${UNIT_LABEL[f.unit] ? ` (${UNIT_LABEL[f.unit]})` : ''}`}
        value={texts[f.path] ?? ''}
        onChangeText={(v) => setTexts((t) => ({ ...t, [f.path]: v }))}
        keyboardType="decimal-pad"
        inputMode="decimal"
        error={fieldErrors[f.path]}
        hint={getPath(DEFAULT_LEGAL_PARAMETERS, f.path) !== getPath(draft, f.path) ? `Domyślnie: ${toText(getPath(DEFAULT_LEGAL_PARAMETERS, f.path), f.unit)}` : undefined}
      />
    </View>
  );

  return (
    <Screen keyboard>
      <Card tone="tinted" elevation={0} className="gap-3 p-5">
        <View className="flex-row items-center gap-3">
          <IconBadge icon="settings-outline" size={48} />
          <AppText variant="title" accessibilityRole="header" className="flex-1">
            Panel administracyjny – parametry prawne
          </AppText>
        </View>
        <AppText>
          Stawki, wymiary urlopów i kwoty roczne używane przez wszystkie kalkulatory i ocenę wniosków. Po zapisaniu zmiana działa od razu, bez
          nowej wersji aplikacji.
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <Badge label={`Aktywna wersja: ${active.version}`} tone="success" icon="checkmark-circle-outline" />
          <Badge label={`${active.effectiveFrom} – ${active.effectiveTo}`} tone="info" />
        </View>
        <AppText variant="small" tone="muted">
          DEMO: zmiany zapisują się na tym urządzeniu. Docelowo dostęp ma tylko rola administratora, a zestawy trafiają do tabeli
          legal_parameters w Supabase (migracja 0005) i aplikacje pobierają najnowszy opublikowany.
        </AppText>
      </Card>

      <SectionHeader title="Wersja zestawu" />
      <Card className="gap-3 p-5">
        <View className="flex-row flex-wrap gap-3">
          <View className="min-w-48 flex-1">
            <TextField label="Identyfikator wersji" value={meta.version} onChangeText={(v) => setMeta((m) => ({ ...m, version: v }))} error={fieldErrors.version} />
          </View>
          <View className="min-w-48 flex-1">
            <TextField label="Obowiązuje od (RRRR-MM-DD)" value={meta.effectiveFrom} onChangeText={(v) => setMeta((m) => ({ ...m, effectiveFrom: v }))} error={fieldErrors.effectiveFrom} />
          </View>
          <View className="min-w-48 flex-1">
            <TextField label="Obowiązuje do (RRRR-MM-DD)" value={meta.effectiveTo} onChangeText={(v) => setMeta((m) => ({ ...m, effectiveTo: v }))} error={fieldErrors.effectiveTo} />
          </View>
        </View>
        <TextField label="Podstawa prawna / opis zmiany" value={meta.note} onChangeText={(v) => setMeta((m) => ({ ...m, note: v }))} multiline error={fieldErrors.note} />
      </Card>

      {GROUPS.map((group) => (
        <View key={group.title} className="gap-3">
          <SectionHeader title={group.title} />
          <Card className="p-5">
            <View className="flex-row flex-wrap gap-3">{group.fields.map(field)}</View>
          </Card>
        </View>
      ))}

      <SectionHeader title="Podgląd skutków zmiany" subtitle={`Przykład: pracownik, ${formatMoney(SAMPLE_GROSS)} brutto, jedno dziecko`} />
      <Card className="gap-2 p-5">
        {[
          ['Podstawa wymiaru', formatMoney(now.base), formatMoney(next.base)],
          ['Macierzyński miesięcznie', formatMoney(now.maternity), formatMoney(next.maternity)],
          ['Rodzicielski miesięcznie', formatMoney(now.parental), formatMoney(next.parental)],
          ['Wariant „z góry” miesięcznie', formatMoney(now.upfront), formatMoney(next.upfront)],
          ['Macierzyński + rodzicielski (tyg.)', `${now.maternityWeeks} + ${now.parentalWeeks}`, `${next.maternityWeeks} + ${next.parentalWeeks}`],
          ['Łącznie dla matki (bez 9 tyg. ojca)', formatMoney(now.total), formatMoney(next.total)],
        ].map(([label, a, b]) => (
          <View key={label} className="flex-row flex-wrap items-center justify-between gap-2 border-b border-base-300 py-2">
            <AppText className="min-w-48 flex-1">{label}</AppText>
            <AppText tone="muted">{a}</AppText>
            <AppText variant="bodyStrong" tone={a === b ? 'default' : 'primary'}>
              → {b}
            </AppText>
          </View>
        ))}
        <AppText variant="small" tone="muted">
          Zmienione pola: {changed.length ? changed.map((f) => f.label).join(', ') : 'brak'}.
        </AppText>
      </Card>

      {problems.length ? (
        <Alert tone="warning" title="Zestaw jest niespójny">
          {problems.join('\n')}
        </Alert>
      ) : null}
      {message ? (
        <Alert tone={message.tone === 'success' ? 'success' : 'error'} title={message.tone === 'success' ? 'Gotowe' : 'Nie zapisano'}>
          {message.text}
        </Alert>
      ) : null}
      <View className="flex-row flex-wrap gap-3">
        <Button label="Zapisz i zastosuj" icon="save-outline" onPress={onSave} disabled={!changed.length && meta.note === active.note} className="min-w-48 flex-1" />
        <Button label="Cofnij zmiany w formularzu" variant="ghost" onPress={() => load(active)} className="min-w-48 flex-1" />
        <Button label="Przywróć wartości domyślne 2026" variant="secondary" icon="refresh" onPress={onReset} className="min-w-48 flex-1" />
      </View>

      <SectionHeader title="Import i eksport (JSON)" />
      <Card className="gap-3 p-5">
        <AppText tone="muted">Eksport zawiera aktywny zestaw – można go opublikować w tabeli legal_parameters albo przenieść na inne urządzenie.</AppText>
        <TextField label="Zestaw parametrów (JSON)" value={json} onChangeText={setJson} multiline numberOfLines={8} />
        <View className="flex-row flex-wrap gap-3">
          <Button label="Pokaż aktywny zestaw" variant="secondary" icon="download-outline" onPress={() => setJson(JSON.stringify(active, null, 2))} className="min-w-48 flex-1" />
          <Button label="Importuj z pola" variant="secondary" icon="cloud-upload-outline" onPress={onImport} disabled={!json.trim()} className="min-w-48 flex-1" />
        </View>
      </Card>

      <SectionHeader title="Historia zmian" />
      <Card className="gap-1 p-5">
        {history.length === 0 ? <AppText tone="muted">Brak zmian – obowiązują wartości domyślne {DEFAULT_LEGAL_PARAMETERS.version}.</AppText> : null}
        {history.map((h, i) => (
          <View key={`${h.at}-${i}`} className="gap-0.5 border-b border-base-300 py-2">
            <AppText variant="bodyStrong">
              {h.version} · {SOURCE_LABEL[h.source]}
            </AppText>
            <AppText variant="small" tone="muted">
              {formatTime(h.at)} · {h.note || 'bez opisu'}
            </AppText>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
