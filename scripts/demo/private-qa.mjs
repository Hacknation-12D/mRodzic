// PRIVATE, local OCR. Nothing from this script is served by the application.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createWorker } from 'tesseract.js';
import { createCanvas } from '@napi-rs/canvas';
const manifest = JSON.parse(await readFile('private/case-manifest.json', 'utf8'));
const requested = process.argv[2];
const record = requested ? manifest.find((r) => r.caseId === requested) : [...manifest].sort((a, b) => a.pages - b.pages)[0];
if (!record) throw new Error('Unknown case ID');
const root = resolve('private/ocr', record.sha256, 'pol-v1'); await mkdir(root, { recursive: true });
const worker = await createWorker('pol', 1, { langPath: resolve('public/ocr'), cachePath: root, logger: () => {} });
const task = getDocument({ data: new Uint8Array(await readFile(resolve('Sprawy', record.privatePath))), verbosity: 0 });
try {
  const pdf = await task.promise;
  for (let n = 1; n <= pdf.numPages; n++) {
    const target = resolve(root, `${n}.json`);
    try { await access(target); continue; } catch { /* resumable by hash + version + page */ }
    const page = await pdf.getPage(n); const viewport = page.getViewport({ scale: 200 / 72 });
    if (viewport.width * viewport.height > 18000000) throw new Error('Resolution limit');
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
    const result = await worker.recognize(canvas.toBuffer('image/png'), { rotateAuto: true });
    await writeFile(target, JSON.stringify({ caseId: record.caseId, fileHash: record.sha256, page: n, confidence: result.data.confidence, text: result.data.text, reviewed: false }, null, 2));
    if (n <= 3) await writeFile(resolve(root, `${n}.png`), canvas.toBuffer('image/png'));
    console.log(`${record.caseId} ${n}/${pdf.numPages} OCR confidence ${result.data.confidence}`);
    page.cleanup();
  }
} finally { await worker.terminate(); await task.destroy(); }
