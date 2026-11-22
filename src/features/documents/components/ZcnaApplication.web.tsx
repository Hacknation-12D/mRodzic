import { useEffect, useState } from 'react';

import { openExternalLink } from '@/shared/lib/links';
import { AppText, Button, Card } from '@/shared/ui';

import { downloadPdf, loadPdfAssets } from '../pdfDownload';
import type { ZamValues } from '../zamFields';
import { fillZusPdf } from '../zamPdf';
import { loadZamProfile, localZamChild, localZamParent } from '../zamPrefill';
import { zcnaInitialValues, zcnaSections } from '../zcnaFields';
import type { ZamApplicationProps } from './ZamApplication';

const fields = zcnaSections.flatMap((group) => group.fields);
const inputClass = 'w-full min-h-11 rounded-field border border-base-300 bg-base-100 px-3 py-2 text-base-content';

function ZcnaEditor({ profile, child }: ZamApplicationProps) {
  const [values, setValues] = useState<ZamValues>();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      const result = await loadZamProfile().catch(() => null);
      if (!active) return;
      const localChild = child ? localZamChild(child) : undefined;
      if (result?.status === 'loaded') {
        const savedChild = result.children.find((item) => item.child_id === child?.id)
          ?? (result.children.length === 1 ? result.children[0] : undefined);
        setValues(zcnaInitialValues(result.parent, savedChild ?? localChild));
      } else {
        setValues(zcnaInitialValues(localZamParent(profile), localChild));
      }
    }
    void load();
    return () => { active = false; };
  }, [child, profile]);

  if (!values) return <Card><AppText accessibilityLiveRegion="polite">Wczytuję dane do ZCNA…</AppText></Card>;
  const currentValues = values;
  const change = (id: string, value: string) => {
    setValues((previous) => ({ ...previous, [id]: value }));
    setError('');
  };

  async function download() {
    setDownloading(true);
    setError('');
    try {
      const [template, font] = await loadPdfAssets('ZCNA');
      const bytes = await fillZusPdf('ZCNA', fields, template, font, currentValues);
      downloadPdf(bytes, 'ZUS-ZCNA.pdf');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się pobrać PDF-u ZCNA.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <AppText variant="heading" accessibilityRole="header">ZUS ZCNA — zgłoszenie członka rodziny</AppText>
      <div className="flex flex-wrap gap-2">
        <Button label={downloading ? 'Przygotowuję PDF…' : 'Pobierz ZCNA (PDF)'} icon="download-outline"
          disabled={downloading} onPress={() => void download()} />
        <Button label="Przejdź do eZUS" variant="secondary" icon="open-outline"
          onPress={() => void openExternalLink('https://www.zus.pl/ezus/logowanie')} />
      </div>
      <AppText tone="muted">Dane osoby ubezpieczonej i dziecka pochodzą z profilu. Pozostałe pola możesz uzupełnić przed pobraniem. Podpis złóż w odpowiednim kanale.</AppText>
      {error ? <AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        {zcnaSections.map(({ title, fields: sectionFields, open }) => (
          <details key={title} open={open} className="rounded-field border border-base-300 p-3">
            <summary className="cursor-pointer font-semibold text-base-content">{title}</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {sectionFields.map((field) => field.type === 'check' ? (
                <label key={field.id} className="flex min-h-11 items-start gap-2 py-2 text-base-content">
                  <input type="checkbox" checked={Boolean(values[field.id])} onChange={(event) => change(field.id, event.currentTarget.checked ? '1' : '')} />
                  {field.label}
                </label>
              ) : (
                <label key={field.id} className="grid gap-1 text-base-content">
                  {field.label}
                  {field.type === 'select' ? (
                    <select className={inputClass} value={values[field.id] ?? ''} onChange={(event) => change(field.id, event.currentTarget.value)}>
                      <option value="">Wybierz</option>
                      {field.options?.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} className={inputClass} value={values[field.id] ?? ''} maxLength={field.maxLength}
                      onChange={(event) => change(field.id, event.currentTarget.value)} />
                  )}
                </label>
              ))}
            </div>
          </details>
        ))}
      </form>
    </Card>
  );
}

export function ZcnaApplication(props: ZamApplicationProps) {
  const [open, setOpen] = useState(false);
  if (props.docId !== 'ubezpieczenie-zdrowotne-dziecka') return null;
  return (
    <>
      <Button label={open ? 'Zamknij formularz ZCNA' : 'Otwórz formularz ZCNA'} icon="document-text-outline"
        variant={open ? 'secondary' : undefined} onPress={() => setOpen(!open)} />
      {open ? <ZcnaEditor {...props} /> : null}
    </>
  );
}
