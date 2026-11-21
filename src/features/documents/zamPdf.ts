// Dystrybucje UMD zawierają zależności używane przez generator w przeglądarce.
import fontkit from '@pdf-lib/fontkit/dist/fontkit.umd.min.js';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField } from 'pdf-lib/dist/pdf-lib.min.js';

import { childDetails, zamSections, type ZamValues } from './zamFields';

const childDescriptionIds = new Set([childDetails.basic.id, childDetails.hospital.id]);
type FormField = { id: string; label: string; type: 'text' | 'date' | 'check' | 'select' };

export async function fillZusPdf(file: string, fields: readonly FormField[], template: ArrayBuffer | Uint8Array, fontBytes: ArrayBuffer | Uint8Array, values: ZamValues) {
  const pdf = await PDFDocument.load(template).catch(() => { throw new Error(`Wzór ${file}.pdf jest uszkodzony lub nie można go odczytać.`); });
  const form = pdf.getForm();
  form.deleteXFA();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true }).catch(() => { throw new Error('Nie można odczytać czcionki z polskimi znakami.'); });
  for (const field of fields) {
    const name = `topmostSubform[0].${field.id}`;
    const entered = values[field.id]?.trim();
    const value = entered && childDescriptionIds.has(field.id) && /\[(?:nazwisko|data urodzenia|miejsce urodzenia)\]/.test(entered)
      ? entered.replace(/\[(?:nazwisko|data urodzenia|miejsce urodzenia)\]/g, '').split(',').map((part) => part.trim()).filter(Boolean).join(', ')
      : entered;
    if (!value && field.type !== 'check') continue;
    const pdfField = form.getFieldMaybe(name);
    if (!pdfField && !value) continue;
    if (!pdfField) throw new Error(`We wzorze ${file} brakuje pola „${field.label}”.`);
    if (field.type === 'check' && pdfField instanceof PDFCheckBox) {
      if (value) pdfField.check();
      else pdfField.uncheck();
    } else if (value && field.type === 'select' && pdfField instanceof PDFDropdown) {
      const option = pdfField.getOptions().find((item) => item === value || item.startsWith(`${value} – `));
      if (!option) throw new Error(`We wzorze ${file} brakuje wybranej opcji dla pola „${field.label}”.`);
      pdfField.select(option);
    } else if (value && pdfField instanceof PDFTextField && (field.type === 'text' || field.type === 'date')) {
      const [year, month, day] = value.split('-');
      const formatted = field.type === 'date' ? `${day}${month}${year}` : value;
      const limit = pdfField.getMaxLength();
      if (limit !== undefined && formatted.length > limit) throw new Error(`Pole „${field.label}” może mieć najwyżej ${limit} znaków.`);
      pdfField.setText(formatted);
    } else {
      throw new Error(`Pole „${field.label}” ma nieobsługiwany typ we wzorze ${file}.`);
    }
  }
  try {
    form.updateFieldAppearances(font);
    return await pdf.save({ updateFieldAppearances: false });
  } catch {
    throw new Error(`Nie udało się zapisać pól w pliku ${file}.pdf.`);
  }
}

export function fillZamPdf(template: ArrayBuffer | Uint8Array, fontBytes: ArrayBuffer | Uint8Array, values: ZamValues) {
  return fillZusPdf('ZAM', zamSections.flatMap((section) => section.fields), template, fontBytes, values);
}
