import { useEffect, useState } from 'react';
import { AppText, Button } from '@/shared/ui';
import { downloadPdf, loadPdfAssets } from '../pdfDownload';
import { workflowPdf } from '../workflowPdf';
import type { ApplicationPdfProps } from './ApplicationPdf';

export function ApplicationPdf({ draft, onReady }: ApplicationPdfProps) {
  const [url, setUrl] = useState(''); const [bytes, setBytes] = useState<Uint8Array>();
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function generate() {
    setBusy(true); setError('');
    try {
      const [template, font] = await loadPdfAssets('ZAM');
      const data = await workflowPdf(template, font, draft);
      setBytes(data); setUrl(URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'application/pdf' })));
      if (draft.status === 'validated') onReady(draft.updatedAt);
    } catch (e) { setError(e instanceof Error ? e.message : 'Nie udało się utworzyć PDF.'); }
    finally { setBusy(false); }
  }
  return <>
    <Button label={busy ? 'Generuję PDF…' : 'Wygeneruj podgląd PDF'} disabled={busy || draft.status === 'draft'} onPress={() => void generate()} />
    {error ? <AppText tone="danger">{error}</AppText> : null}
    {url && bytes ? <>
      <iframe title="Podgląd wypełnionego wniosku DEMO" src={url} style={{ width: '100%', height: 560, border: '1px solid #aaa' }} />
      <Button label="Pobierz wypełniony PDF" onPress={() => downloadPdf(bytes, `DEMO-${draft.formId}-${draft.id}.pdf`)} />
      <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">Otwórz PDF do drukowania</a>
    </> : null}
  </>;
}
