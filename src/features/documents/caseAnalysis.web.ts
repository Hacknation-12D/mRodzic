import { classifyPage, extractPageFacts } from '@/core/applications/extraction';
import type { CaseDocument } from '@/core/applications/model';

type Pdfjs = typeof import('pdfjs-dist');
type Tesseract = typeof import('tesseract.js');
declare global { interface Window { mrodzicPdfjs?: Pdfjs; Tesseract?: Tesseract } }
async function script(src: string, module = false) {
  await new Promise<void>((resolve, reject) => {
    const element = document.createElement('script'); element.src = src;
    if (module) element.type = 'module';
    element.onload = () => resolve(); element.onerror = () => { element.remove(); reject(new Error('Brak lokalnych plików OCR. Uruchom npm run pdf:assets. Dane można wpisać ręcznie.')); };
    document.head.append(element);
  });
}
export async function pdfLibrary() {
  if (!window.mrodzicPdfjs) await script('/ocr/bridge.mjs', true);
  if (!window.mrodzicPdfjs) throw new Error('Nie uruchomiono parsera PDF.');
  return window.mrodzicPdfjs;
}
export async function analysePdf(bytes: Uint8Array, synthetic: boolean, signal: AbortSignal, progress: (value: string) => void, cache = new Map<number, CaseDocument['pages'][number]>()) {
  if (bytes.length > 30 * 1024 * 1024 || new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Wybierz PDF do 30 MB.');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))).map((v) => v.toString(16).padStart(2, '0')).join('');
  const library = await pdfLibrary();
  const task = library.getDocument({ data: bytes.slice(), verbosity: 0, stopAtErrors: true, maxImageSize: 18000000 });
  let worker: Awaited<ReturnType<Tesseract['createWorker']>> | undefined;
  const abort = () => { void worker?.terminate(); void task.destroy(); };
  signal.addEventListener('abort', abort);
  const caseId = `PDF-${hash.slice(0, 12)}`;
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 150) throw new Error('Limit wynosi 150 stron na sprawę.');
    const pages: CaseDocument['pages'] = [];
    for (let page = 1; page <= pdf.numPages; page++) {
      if (signal.aborted) throw new Error('Przerwano analizę. Możesz wznowić.');
      progress(`Strona ${page} z ${pdf.numPages}`);
      if (cache.has(page)) { pages.push(cache.get(page)!); continue; }
      const source = await pdf.getPage(page);
      let text = (await source.getTextContent()).items.map((item) => 'str' in item ? item.str : '').join('\n');
      let confidence = 1;
      let method: 'text' | 'ocr' = 'text';
      if (text.trim().length < 30) {
        method = 'ocr';
        if (!worker) {
          if (!window.Tesseract) await script('/ocr/tesseract.min.js');
          worker = await window.Tesseract!.createWorker('pol', 1, { workerPath: '/ocr/worker.min.js', corePath: '/ocr', langPath: '/ocr', workerBlobURL: false, cacheMethod: 'none' });
          if (signal.aborted) throw new Error('Przerwano analizę.');
        }
        const viewport = source.getViewport({ scale: 200 / 72 });
        if (viewport.width * viewport.height > 18000000) throw new Error('Strona przekracza limit rozdzielczości.');
        const canvas = document.createElement('canvas'); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        await source.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
        const result = await worker.recognize(canvas, { rotateAuto: true });
        text = result.data.text; confidence = result.data.confidence / 100;
        canvas.width = 0; canvas.height = 0;
      }
      const entry = { page, text, confidence, method, documentType: classifyPage(text) };
      cache.set(page, entry); pages.push(entry);
      source.cleanup();
    }
    return { caseId, fileHash: hash, pageCount: pdf.numPages, synthetic, parserVersion: 'local-pol-v1', pages,
      facts: pages.flatMap((p) => extractPageFacts(p.text, { caseId, fileHash: hash, page: p.page, documentType: p.documentType }, p.confidence)),
    } satisfies CaseDocument;
  } finally { signal.removeEventListener('abort', abort); await worker?.terminate(); await task.destroy(); }
}
