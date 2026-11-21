import { useEffect, useState } from 'react';

import { goToProfile } from '@/core/navigation/routes';
import { openExternalLink } from '@/shared/lib/links';
import { AppText, Button, Card } from '@/shared/ui';

import { downloadPdf, loadPdfAssets } from '../pdfDownload';
import { applicant, childDetails, zamLeave, zamSections, type ZamValues } from '../zamFields';
import { fillZamPdf } from '../zamPdf';
import { loadZamProfile, localZamChild, localZamParent, zamChildValuesFromForm, zamInitialValues, type ZamChild } from '../zamPrefill';
import type { ZamApplicationProps } from './ZamApplication';

const ezusUrl = 'https://www.zus.pl/ezus/logowanie';
const inputClass = 'w-full min-h-11 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-base-content';

function ZamEditor({ docId, profile, child }: ZamApplicationProps) {
  const [values, setValues] = useState<ZamValues>();
  const [children, setChildren] = useState<ZamChild[]>([]);
  const [childId, setChildId] = useState('');
  const [source, setSource] = useState<Awaited<ReturnType<typeof loadZamProfile>>['status']>();
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadFailed, setDownloadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await loadZamProfile().catch(() => ({ status: 'error' } as const));
      if (!active) return;
      setSource(result.status);
      if (result.status === 'loaded') {
        const match = result.children.find((candidate) => candidate.child_id === child?.id)
          ?? (result.children.length === 1 ? result.children[0] : undefined);
        setChildren(result.children);
        setChildId(match?.child_id ?? '');
        setValues(zamInitialValues(docId, result.parent, match));
        return;
      }
      const localChild = child ? localZamChild(child) : undefined;
      setChildren(localChild ? [localChild] : []);
      setChildId(localChild?.child_id ?? '');
      setValues(zamInitialValues(docId, localZamParent(profile), localChild));
    }
    void load();
    return () => { active = false; };
    // Prefill is a snapshot when the editor opens. Edits stay in this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!values) return <Card><AppText accessibilityLiveRegion="polite">Wczytuję dane do formularza ZAM…</AppText></Card>;
  const currentValues = values;
  const setField = (field: string, value: string) => {
    const selectedChild = children.find((item) => item.child_id === childId);
    setValues((previous = {}) => {
      const next = { ...previous, [field]: value || undefined };
      if (field === applicant.lastName.id || field === applicant.city.id) {
        const oldFill = zamChildValuesFromForm(selectedChild, docId, previous);
        const newFill = zamChildValuesFromForm(selectedChild, docId, next);
        for (const { id } of [childDetails.basic, childDetails.hospital]) {
          if (previous[id] === oldFill[id]) next[id] = newFill[id];
        }
      }
      return next;
    });
    setMessage('');
    setDownloadFailed(false);
  };
  const chooseChild = (next: string) => {
    setChildId(next);
    setValues((previous = {}) => ({ ...previous, ...zamChildValuesFromForm(children.find((item) => item.child_id === next), docId, previous) }));
  };

  async function download() {
    setDownloading(true);
    setMessage('');
    setDownloadFailed(false);
    try {
      const [template, font] = await loadPdfAssets('ZAM');
      const bytes = await fillZamPdf(template, font, currentValues);
      try {
        downloadPdf(bytes, 'ZUS-ZAM.pdf');
      } catch {
        throw new Error('Przeglądarka nie uruchomiła zapisu pliku ZUS-ZAM.pdf.');
      }
      setMessage('Rozpoczęto pobieranie pliku ZUS-ZAM.pdf.');
    } catch (error) {
      setDownloadFailed(true);
      setMessage(error instanceof Error ? error.message : 'Nie udało się przygotować pliku ZUS-ZAM.pdf.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">ZAM — wniosek o zasiłek macierzyński</AppText>
      <div className="flex flex-wrap gap-2">
        <Button label={downloading ? 'Przygotowuję PDF…' : 'Pobierz ZAM (PDF)'} icon="download-outline"
          disabled={downloading} onPress={() => void download()} />
        <Button label="Wyślij" icon="send-outline" variant="secondary" onPress={() => void openExternalLink(ezusUrl)} />
      </div>
      <AppText tone="muted">PDF zawiera aktualnie wczytane i wpisane dane. Brakujące pola pozostaną puste.</AppText>
      {message ? (
        <AppText tone={downloadFailed ? 'danger' : 'default'} accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
      {source === 'loaded' ? <AppText tone="muted">Dane wnioskodawcy pobrano z konta Supabase. Możesz je sprawdzić i poprawić w tym wniosku.</AppText> : null}
      {source === 'offline' ? <AppText tone="muted">Dane wczytano z profilu na tym urządzeniu.</AppText> : null}
      <AppText tone="muted">Gdy brakuje nazwiska lub miejsca urodzenia dziecka, formularz podpowiada nazwisko i miejscowość rodzica. Sprawdź, czy dane dziecka są poprawne.</AppText>
      {source === 'error' ? <AppText tone="danger">Nie udało się pobrać danych z konta. Wczytano profil z tego urządzenia.</AppText> : null}
      {source === 'signed-out' || source === 'empty' ? (
        <>
          <AppText tone="muted">{source === 'signed-out' ? 'Zaloguj się na konto rodzinne, aby pobrać zapisane dane.' : 'Zapisz profil na koncie rodzinnym, aby użyć jego danych.'}</AppText>
          <Button label="Przejdź do profilu" variant="secondary" onPress={goToProfile} />
        </>
      ) : null}
      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        {children.length > 1 ? (
          <label className="grid gap-1 text-base-content">
            Dziecko z konta rodzinnego
            <select className={inputClass} value={childId} onChange={(event) => chooseChild(event.currentTarget.value)}>
              <option value="">Wybierz dziecko</option>
              {children.map((item) => <option key={item.child_id} value={item.child_id}>{[item.name, item.last_name].filter(Boolean).join(' ')}</option>)}
            </select>
          </label>
        ) : null}
        {zamSections.map(({ title, fields, open }) => (
          <details key={title} open={open} className="rounded-field border border-base-300 p-3">
            <summary className="cursor-pointer font-semibold text-base-content">{title}</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {fields.map((field) => field.type === 'check' ? (
                <label key={field.id} className="flex min-h-11 items-start gap-2 py-2 text-base-content">
                  <input type="checkbox" checked={Boolean(values[field.id])}
                    onChange={(event) => setField(field.id, event.currentTarget.checked ? '1' : '')} />
                  {field.label}
                </label>
              ) : (
                <label key={field.id} className="grid gap-1 text-base-content">
                  {field.label}
                  <input className={inputClass} type={field.type} value={values[field.id] ?? ''} maxLength={field.maxLength ?? 150}
                    placeholder={field.label.includes('od–do') ? 'DD.MM.RRRR – DD.MM.RRRR' : undefined}
                    inputMode={field.maxLength ? 'numeric' : undefined}
                    onChange={(event) => setField(field.id, event.currentTarget.value)} />
                </label>
              ))}
            </div>
          </details>
        ))}
      </form>
      <AppText tone="muted">„Wyślij” otwiera eZUS. Wybierz usługę „Złożenie dokumentu ZAM” i podpisz wniosek w eZUS.</AppText>
    </Card>
  );
}

export function ZamApplication(props: ZamApplicationProps) {
  const [open, setOpen] = useState(false);
  if (!zamLeave(props.docId)) return null;
  return (
    <>
      <Button label={open ? 'Zamknij formularz ZAM' : 'Otwórz formularz ZAM'}
        icon="document-text-outline" variant={open ? 'secondary' : undefined} onPress={() => setOpen(!open)} />
      {open ? <ZamEditor {...props} /> : null}
    </>
  );
}
