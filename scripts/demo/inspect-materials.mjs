// Local only. Never writes private source text to public/, content/ or logs.
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

await mkdir('private/materials', { recursive: true });
const files = (await readdir('.')).filter((p) => p.toLowerCase().endsWith('.pdf'));
for (const [index, file] of files.entries()) {
  const task = getDocument({ data: new Uint8Array(await readFile(file)), isEvalSupported: false, verbosity: 0 });
  const pdf = await task.promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const p = await pdf.getPage(i);
    const text = (await p.getTextContent()).items.map((t) => t.str ?? '').join(' ');
    pages.push({ page: i, text });
  }
  await writeFile(`private/materials/material-${index + 1}.json`, JSON.stringify({ file, pages }, null, 2));
  console.log(`${basename(file)}: ${pdf.numPages} pages, ${pages.filter((p) => p.text.trim()).length} text pages`);
  await task.destroy();
}
if (process.argv.includes('--cases')) {
  const names = (await readdir('Sprawy')).filter((p) => p.endsWith('.pdf'));
  const manifest = [];
  for (const file of names) {
    const bytes = await readFile(resolve('Sprawy', file));
    const hash = createHash('sha256').update(bytes).digest('hex');
    const task = getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 });
    const pdf = await task.promise;
    manifest.push({ caseId: `CASE_${String(manifest.length + 1).padStart(3, '0')}`, sha256: hash, pages: pdf.numPages, privatePath: file, verified: false });
    await task.destroy();
  }
  await writeFile('private/case-manifest.json', JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ cases: manifest.length, pages: manifest.reduce((n, c) => n + c.pages, 0), unique: new Set(manifest.map((c) => c.sha256)).size, verified: 0 }));
}
