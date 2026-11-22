import fontkit from '@pdf-lib/fontkit/dist/fontkit.umd.min.js';
import { PDFDocument } from 'pdf-lib/dist/pdf-lib.min.js';
import { evaluateApplication } from '@/core/applications/engine';
import { zamSections } from '@/core/applications/forms/zamFields';
import type { ApplicationDraft, BenefitFacts } from '@/core/applications/model';
import { fillZamPdf } from './zamPdf';

export async function textPdf(fontBytes: ArrayBuffer | Uint8Array, title: string, sections: string[][]) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });
  let page = pdf.addPage([595, 842]); let y = 780;
  const nextPage = () => { page = pdf.addPage([595, 842]); y = 780; };
  const line = (text: string, size = 11) => {
    if (y < 55) nextPage();
    page.drawText(text, { x: 45, y, size, font }); y -= size + 8;
  };
  line('SYMULACJA - DANE FIKCYJNE', 16); line(title, 14);
  line('Projekt do weryfikacji. Nie wysłano do żadnej instytucji.', 10);
  for (const [index, section] of sections.entries()) {
    if (index) nextPage();
    for (const paragraph of section) {
      let current = '';
      for (const word of paragraph.replace(/[\r\n\t]/g, ' ').split(' ')) {
        if (font.widthOfTextAtSize(`${current} ${word}`, 11) > 500 && current) { line(current); current = ''; }
        // Bound long unbroken user inputs as well.
        for (const char of `${current ? ' ' : ''}${word}`) {
          if (font.widthOfTextAtSize(current + char, 11) > 500) { line(current); current = ''; }
          current += char;
        }
      }
      if (current) line(current);
    }
  }
  pdf.getPages().forEach((p, i, pages) => p.drawText(`DEMO | ${i + 1}/${pages.length}`, { x: 45, y: 25, size: 9, font }));
  return pdf.save();
}
export function syntheticCasePdf(font: ArrayBuffer | Uint8Array, f: BenefitFacts) {
  return textPdf(font, 'Syntetyczna teczka do analizy', [
    ['Poświadczenie ubezpieczenia chorobowego - przykład fikcyjny', `Data zdarzenia: ${f.eventDate}`, `Ubezpieczenie chorobowe: ${f.insurance}`, `Ubezpieczenie od: ${f.insuranceSince}`, ...(f.insuranceUntil ? [`Ubezpieczenie do: ${f.insuranceUntil}`] : [])],
    ['Historia podstaw składek - przykład fikcyjny', `Podstawa brutto grosze: ${f.baseGrossCents}`, 'To zestaw testowy. Podstawa wymaga potwierdzenia przez użytkownika.'],
  ]);
}
export async function workflowPdf(template: ArrayBuffer, font: ArrayBuffer, draft: ApplicationDraft) {
  const result = evaluateApplication(draft.facts);
  const summary = [
    `Wniosek: ${draft.formId} | wersja: ${draft.formVersion}`, `Profil: ${draft.owner} | Sprawa: ${draft.caseId}`,
    `Odbiorca: ${draft.recipient}`, `Okres: ${draft.facts.start} - ${draft.facts.end}`,
    `Reguły: ${result.rulesVersion}; data zdarzenia: ${result.effectiveDate}`,
    ...result.reasons,
    ...(result.amount ? [`Kwota za ${result.amount.days} dni: ${(result.amount.totalCents / 100).toFixed(2)} PLN. Dziennie: ${(result.amount.dailyCents / 100).toFixed(2)} PLN.`] : []),
    ...(draft.submissionId ? [`Identyfikator symulacji: ${draft.submissionId}`, 'Złożono w symulacji - nie wysłano do urzędu. To nie jest UPP.'] : []),
  ];
  const project = await textPdf(font, 'Projekt wniosku - mRodzic DEMO', [summary, ...zamSections.map((section) => [section.title, ...section.fields.filter((f) => draft.values[f.id]).map((f) => `${f.label}: ${draft.values[f.id]}`)])]);
  if (draft.formId !== 'ZAM') return project;
  const pdf = await PDFDocument.load(await fillZamPdf(template, font, draft.values));
  const cover = await PDFDocument.load(project);
  const [first] = await pdf.copyPages(cover, [0]); pdf.insertPage(0, first);
  return pdf.save({ updateFieldAppearances: false });
}
