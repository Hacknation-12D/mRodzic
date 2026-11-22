import { useEffect, useRef, useState } from 'react';
import { factConflicts } from '@/core/applications/extraction';
import type { CaseDocument } from '@/core/applications/model';
import { AppText, Button, Card } from '@/shared/ui';
import { analysePdf } from '../caseAnalysis.web';
import { downloadPdf, loadPdfAssets } from '../pdfDownload';
import { syntheticCasePdf } from '../workflowPdf';
import type { CaseWorkbenchProps } from './CaseWorkbench';

export function CaseWorkbench({ draft, onCase }: CaseWorkbenchProps) {
  const [result, setResult] = useState<CaseDocument>();
  const [status, setStatus] = useState(''); const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState(''); const [page, setPage] = useState(1);
  const bytes = useRef<Uint8Array | null>(null); const abort = useRef<AbortController | null>(null);
  const cache = useRef(new Map<number, CaseDocument['pages'][number]>());
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; abort.current?.abort(); }; }, []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  async function run(data?: Uint8Array) {
    if (data) { bytes.current = data; cache.current.clear(); setResult(undefined); setUrl(URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'application/pdf' }))); }
    if (!bytes.current) return;
    abort.current = new AbortController(); setBusy(true);
    try {
      const document = await analysePdf(bytes.current, true, abort.current.signal, (text) => { if (alive.current) setStatus(text); }, cache.current);
      if (alive.current) { setResult(document); setStatus('Odczyt zakończony. Sprawdź źródła i popraw pola.'); }
    } catch (error) { if (alive.current) setStatus(abort.current.signal.aborted ? 'Przerwano. Wznów analizę lub wpisz dane ręcznie.' : error instanceof Error ? error.message : 'Błąd odczytu.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function synthetic() {
    try { const [, font] = await loadPdfAssets('ZAM'); const data = await syntheticCasePdf(font, draft.facts); downloadPdf(data, 'teczka-syntetyczna.pdf'); await run(data); }
    catch { setStatus('Nie udało się wygenerować teczki. Uzupełnij dane ręcznie.'); }
  }
  async function file(file?: File) {
    if (!file) return;
    if (file.size > 30 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.pdf')) { setStatus('Dozwolony jest PDF do 30 MB.'); return; }
    await run(new Uint8Array(await file.arrayBuffer()));
  }
  return <Card>
    <AppText variant="heading">Analiza PDF na tym urządzeniu</AppText>
    <AppText>Publiczne DEMO: używaj wyłącznie fikcyjnych dokumentów. PDF i OCR nie są przesyłane do serwera ani AI. Zamknięcie tego kroku usuwa plik z pamięci.</AppText>
    <Button label="Utwórz i analizuj syntetyczną teczkę" disabled={busy} onPress={() => void synthetic()} />
    <div className="rounded-field border border-base-300 p-4 text-base-content" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (!busy) void file(e.dataTransfer.files[0]); }}>
      <label>Wybierz syntetyczny PDF (do 150 stron) <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => void file(e.currentTarget.files?.[0])} /></label>
    </div>
    {busy ? <Button label="Przerwij OCR" variant="secondary" onPress={() => abort.current?.abort()} /> : bytes.current && !result ? <Button label="Wznów analizę" onPress={() => void run()} /> : null}
    <AppText accessibilityLiveRegion="polite">{status}</AppText>
    {result ? <>
      <AppText>{result.pageCount} stron · SHA-256: {result.fileHash.slice(0, 16)}…</AppText>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className="text-base-content">Strona <input type="number" min={1} max={result.pageCount} value={page} onChange={(e) => setPage(Math.max(1, Math.min(result.pageCount, Number(e.currentTarget.value))))} /></label><iframe title="Źródłowy PDF" src={`${url}#page=${page}`} style={{ width: '100%', height: 500, border: 0 }} /></div>
        <div className="grid content-start gap-3 text-base-content">
          {result.facts.length === 0 ? <p>Nie znaleziono jednoznacznych pól. Przeczytaj stronę i wpisz dane ręcznie w następnym kroku.</p> : null}
          {result.facts.map((fact, i) => <label key={`${fact.key}-${fact.source.page}`} className="grid gap-1 rounded-field border border-base-300 p-3">
            {fact.key} · strona {fact.source.page} · pewność {Math.round(fact.confidence * 100)}%
            <input aria-label={`${fact.key} ze strony ${fact.source.page}`} className="rounded border p-2" value={fact.normalizedValue} onChange={(e) => { const value = e.currentTarget.value; setResult({ ...result, facts: result.facts.map((f, n) => i === n ? { ...f, normalizedValue: value, reviewed: false, verificationStatus: 'unreviewed' } : f) }); }} />
            <span><input type="checkbox" checked={fact.reviewed} onChange={(e) => { const checked = e.currentTarget.checked; setResult({ ...result, facts: result.facts.map((f, n) => i === n ? { ...f, reviewed: checked, verificationStatus: checked ? f.rawValue === f.normalizedValue ? 'confirmed' : 'corrected' : 'unreviewed' } : f) }); }} /> Potwierdzam po porównaniu ze stroną</span>
            <button type="button" onClick={() => setPage(fact.source.page)}>Pokaż stronę źródłową</button>
          </label>)}
          <p>Konflikty: {factConflicts(result.facts).join(', ') || 'brak'}</p>
        </div>
      </div>
      <Button label="Zastosuj potwierdzone fakty" disabled={!result.facts.length || result.facts.some((f) => !f.reviewed) || factConflicts(result.facts).length > 0} onPress={() => onCase(result)} />
      <details className="text-base-content"><summary>Klasyfikacja stron i tekst odczytu</summary>{result.pages.map((p) => <div key={p.page}><strong>Strona {p.page}: {p.documentType} ({p.method})</strong><pre style={{ whiteSpace: 'pre-wrap' }}>{p.text}</pre></div>)}</details>
    </> : null}
  </Card>;
}
