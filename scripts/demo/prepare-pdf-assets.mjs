import { mkdir, copyFile, readdir, writeFile, access } from 'node:fs/promises';
const target = 'public/ocr';
await mkdir(target, { recursive: true });
for (const name of ['pdf.mjs', 'pdf.worker.mjs']) await copyFile(`node_modules/pdfjs-dist/legacy/build/${name}`, `${target}/${name}`);
for (const name of ['worker.min.js', 'tesseract.min.js']) await copyFile(`node_modules/tesseract.js/dist/${name}`, `${target}/${name}`);
for (const name of await readdir('node_modules/tesseract.js-core')) {
  if (name.endsWith('.wasm') || name.endsWith('.wasm.js')) await copyFile(`node_modules/tesseract.js-core/${name}`, `${target}/${name}`);
}
await writeFile(`${target}/bridge.mjs`, "import * as pdfjs from './pdf.mjs'; pdfjs.GlobalWorkerOptions.workerSrc='/ocr/pdf.worker.mjs'; window.mrodzicPdfjs=pdfjs;");
try { await access(`${target}/pol.traineddata.gz`); }
catch {
  const response = await fetch('https://tessdata.projectnaptha.com/4.0.0/pol.traineddata.gz');
  if (!response.ok) throw new Error('Nie pobrano polskiego modelu OCR');
  await writeFile(`${target}/pol.traineddata.gz`, new Uint8Array(await response.arrayBuffer()));
}
console.log('PDF.js i polski OCR gotowe do lokalnego przetwarzania.');
