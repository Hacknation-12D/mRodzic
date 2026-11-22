import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
const input = process.argv[2] ?? 'tmp/pdfs/workflow-zam.pdf';
const task = getDocument({ data: new Uint8Array(await readFile(input)), verbosity: 0 });
const pdf = await task.promise;
await mkdir('tmp/pdfs/rendered', { recursive: true });
for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n); const viewport = page.getViewport({ scale: 1.2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
  await writeFile(`tmp/pdfs/rendered/page-${n}.png`, canvas.toBuffer('image/png'));
}
console.log(`Rendered ${pdf.numPages} pages`); await task.destroy();
