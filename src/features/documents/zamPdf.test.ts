import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';

import { applicant, childDetails, leaves, reasons, zamLeave } from './zamFields';
import { fillZamPdf, fillZusPdf } from './zamPdf';
import { zamChildValues, zamChildValuesFromForm } from './zamPrefill';
import { zcnaInitialValues, zcnaSections } from './zcnaFields';

vi.mock('@/core/supabase/client', () => ({ getFamilySupabase: vi.fn() }));

it('zapisuje częściowe zgłoszenie ZCNA z danymi i opcjami z oryginalnego wzoru', async () => {
  const values = zcnaInitialValues({
    first_name: 'Anna', last_name: 'Łącka', pesel: null, birth_date: null,
    street: null, house_number: null, apartment_number: null, postal_code: null, city: 'Łódź',
  }, { child_id: '1', name: 'Paweł', last_name: null, status: 'born', birth_date: '2026-10-01', birth_place: null, due_date: null });
  const template = readFileSync('public/pdfs/ZCNA.pdf');
  const fields = zcnaSections.flatMap((section) => section.fields);
  const form = (await PDFDocument.load(template)).getForm();
  for (const field of fields) expect(form.getFieldMaybe(`topmostSubform[0].${field.id}`)).toBeDefined();
  const bytes = await fillZusPdf('ZCNA', fields, template, readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf'), values);
  const result = (await PDFDocument.load(bytes)).getForm();
  expect(result.getTextField('topmostSubform[0].Page1[0].IV08A_Imie[0]').getText()).toBe('Paweł');
  expect(result.getTextField('topmostSubform[0].Page1[0].IV07A_Nazwisko[0]').getText()).toBe('Łącka');
  expect(result.getTextField('topmostSubform[0].Page1[0].IV09A_DataUrodzenia[0]').getText()).toBe('01102026');
  expect(result.getDropdown('topmostSubform[0].Page1[0].IV10A[0]').getSelected()[0]).toMatch(/^11 –/);
});

describe('formularz ZAM', () => {
  it.each([
    ['urlop-macierzynski', leaves.macierzyński],
    ['urlop-rodzicielski', leaves.rodzicielski],
    ['urlop-ojcowski', leaves.ojcowski],
    ['dodatkowy-urlop-wczesniak', leaves.uzupełniający],
  ])('dobiera zakres ZAM dla %s', (documentId, leave) => {
    expect(zamLeave(documentId)).toBe(leave);
  });

  it('pobiera częściowo uzupełniony ZAM mimo pustych wymaganych pól', async () => {
    const values = { [applicant.firstName.id]: 'Anna', [applicant.city.id]: 'Łódź' };
    const template = await PDFDocument.create();
    const page = template.addPage();
    const form = template.getForm();
    const fullName = (id: string) => `topmostSubform[0].${id}`;
    for (const field of [applicant.firstName, applicant.city, applicant.lastName]) {
      form.createTextField(fullName(field.id)).addToPage(page);
    }

    const saved = await fillZamPdf(await template.save({ updateFieldAppearances: false }),
      readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf'), values);
    const exported = (await PDFDocument.load(saved)).getForm();
    expect(exported.getTextField(fullName(applicant.firstName.id)).getText()).toBe('Anna');
    expect(exported.getTextField(fullName(applicant.city.id)).getText()).toBe('Łódź');
    expect(exported.getTextField(fullName(applicant.lastName.id)).getText()).toBeUndefined();
  });

  it('podaje nazwę brakującego pola we wzorze', async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    await expect(fillZamPdf(
      await pdf.save(),
      readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf'),
      { [applicant.firstName.id]: 'Anna' },
    )).rejects.toThrow('We wzorze ZAM brakuje pola „Imię”.');
  });

  it('podaje nazwę pola i limit znaków', async () => {
    await expect(fillZamPdf(
      readFileSync('public/pdfs/ZAM.pdf'),
      readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf'),
      { [applicant.pesel.id]: '123456789012' },
    )).rejects.toThrow('Pole „PESEL” może mieć najwyżej 11 znaków.');
  });

  it('zapisuje polskie znaki i zaznaczenia w oryginalnych polach PDF', async () => {
    const bytes = await fillZamPdf(
      readFileSync('public/pdfs/ZAM.pdf'),
      readFileSync('public/pdfs/fonts/NotoSans-Regular.ttf'),
      {
        [applicant.firstName.id]: 'Żaneta',
        [applicant.lastName.id]: 'Łącka',
        [applicant.city.id]: 'Łódź',
        [applicant.street.id]: 'Źródlana',
        [applicant.birthDate.id]: '1990-05-14',
        [leaves.macierzyński.id]: '1',
        [reasons.birth.id]: '1',
        [childDetails.basic.id]: 'Jaś Łącki, 21.08.2026, Świętochłowice',
        [childDetails.hospital.id]: 'Paweł [nazwisko], 01.10.2026, [miejsce urodzenia]',
      },
    );
    const form = (await PDFDocument.load(bytes)).getForm();
    const fullName = (id: string) => `topmostSubform[0].${id}`;
    expect(form.getTextField(fullName(applicant.firstName.id)).getText()).toBe('Żaneta');
    expect(form.getTextField(fullName(applicant.lastName.id)).getText()).toBe('Łącka');
    expect(form.getTextField(fullName(applicant.street.id)).getText()).toBe('Źródlana');
    expect(form.getTextField(fullName(applicant.birthDate.id)).getText()).toBe('14051990');
    expect(form.getTextField(fullName(childDetails.basic.id)).getText()).toContain('Świętochłowice');
    expect(form.getTextField(fullName(childDetails.hospital.id)).getText()).toBe('Paweł, 01.10.2026');
    expect(form.getCheckBox(fullName(leaves.macierzyński.id)).isChecked()).toBe(true);
  });

  it('podpowiada brakujące dane Pawła z danych rodzica i zachowuje zapisane miejsce urodzenia', () => {
    const child = { child_id: 'pawel', name: 'Paweł', last_name: null, status: 'born' as const, birth_date: '2026-10-01', birth_place: null, due_date: null };
    const parent = { [applicant.lastName.id]: 'Łącki', [applicant.city.id]: 'Łódź' };
    expect(zamChildValuesFromForm(child, 'urlop-macierzynski', parent)[childDetails.basic.id]).toBe('Paweł Łącki, 01.10.2026, Łódź');
    expect(zamChildValuesFromForm({ ...child, birth_place: 'Żory' }, 'urlop-macierzynski', parent)[childDetails.basic.id]).toBe('Paweł Łącki, 01.10.2026, Żory');
  });

  it('uzupełnia dane dziecka z profilu', () => {
    const child = { child_id: 'test', name: 'Zofia', last_name: 'Łącka', status: 'born' as const, birth_date: '2026-09-15', birth_place: null, due_date: null };
    const values = zamChildValues(child, 'urlop-macierzynski');
    expect(values[childDetails.basic.id]).toContain('Zofia Łącka');
    const complete = zamChildValues({ ...child, birth_place: 'Łódź' }, 'urlop-macierzynski');
    expect(complete[childDetails.basic.id]).toBe('Zofia Łącka, 15.09.2026, Łódź');
  });
});
