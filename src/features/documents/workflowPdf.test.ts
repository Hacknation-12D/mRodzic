import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { expect, it } from 'vitest';
import { ProfileSchema } from '@/core/schemas/profile';
import { newApplication, validateDraft } from '@/core/applications/workflow';
import { applicant } from '@/core/applications/forms/zamFields';
import { syntheticCasePdf, workflowPdf } from './workflowPdf';

it('generuje wielostronicową teczkę i prawdziwy ZAM z polskimi znakami', async () => {
  const profiles = JSON.parse(readFileSync('src/dev/dummyData/mrodzic_compat_profiles_v1.json', 'utf8'));
  const p = ProfileSchema.parse(profiles[4].profile);
  const d = newApplication(p, 'P05', p.children[0], '2026-11-22', 'test', '2026-11-22T00:00:00Z');
  d.facts = { ...d.facts, eventDate: '2026-11-01', start: '2026-11-01', end: '2026-11-30', verified: true, baseConfirmed: true, insurance: 'yes', insuranceSince: '2020-01-01', baseGrossCents: 600000 };
  d.attachmentsConfirmed = true; d.signatureConfirmed = true;
  d.values[applicant.city.id] = 'Łódź';
  const font = readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf');
  const synthetic = await syntheticCasePdf(font, d.facts);
  expect((await PDFDocument.load(synthetic)).getPageCount()).toBe(2);
  const template = readFileSync('public/pdfs/ZAM.pdf');
  const bytes = await workflowPdf(new Uint8Array(template).buffer, new Uint8Array(font).buffer, validateDraft(d, d.createdAt));
  const pdf = await PDFDocument.load(bytes);
  expect(pdf.getForm().getTextField(`topmostSubform[0].${applicant.city.id}`).getText()).toBe('Łódź');
  expect(pdf.getPageCount()).toBeGreaterThan(5);
  mkdirSync('tmp/pdfs', { recursive: true });
  writeFileSync('tmp/pdfs/workflow-zam.pdf', bytes); writeFileSync('tmp/pdfs/synthetic.pdf', synthetic);
});
