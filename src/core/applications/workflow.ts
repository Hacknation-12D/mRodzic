import { isValidPesel } from '../profile/pesel';
import type { Child, Profile } from '../types';
import { addDateDays, evaluateApplication, LEGAL_2026 } from './engine';
import { applicant, childDetails, leaveDates, leaves, payer, reasons, statements } from './forms/zamFields';
import { ApplicationDraftSchema, BenefitFactsSchema, type ApplicationDraft, type BenefitFacts } from './model';

export const FORM_VERSION = 'ZAM-2026-10-24';
export const FORM_SOURCE = 'https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski';
export const applicationOwner = (profile: Profile, demoId: string | null) => demoId ?? `manual:${profile.me.id}:${profile.createdAt}`;
export function defaultFacts(profile: Profile, child: Child, today: string): BenefitFacts {
  const zus = profile.me.work?.zus;
  const eventDate = child.birthDate ?? child.dueDate ?? today;
  const earnings = profile.me.work?.earnings ?? [];
  const count = child.multipleBirthGroupId ? profile.children.filter((c) => c.multipleBirthGroupId === child.multipleBirthGroupId).length : 1;
  return BenefitFactsSchema.parse({
    kind: 'maternity', eventDate, start: eventDate, end: addDateDays(eventDate, LEGAL_2026.maternityWeeks[Math.min(count, 5) - 1] * 7 - 1), applicationDate: today,
    // Bez konta ZUS: student / osoba bez pracy nie ma tytułu do ubezpieczenia chorobowego; w innych przypadkach – nie wiemy.
    insurance: zus ? zus.sickness.insured ? 'yes' : 'no' : profile.me.employment === 'student' || profile.me.employment === 'unemployed' ? 'no' : 'unknown', insuranceSince: zus?.sickness.since ?? '', insuranceUntil: zus?.sickness.until ?? '',
    employment: profile.me.employment ?? 'other', baseGrossCents: Math.round((earnings.length ? earnings.reduce((n, e) => n + e.gross, 0) / earnings.length : profile.me.work?.monthlyGross ?? 0) * 100),
    baseConfirmed: false, childrenCount: Math.min(count, 5), childBirthDate: child.birthDate ?? '',
    upfront: false, reserved: false, part: 1, zaZyciem: false, schoolDeferral: false,
    debtCents: Math.round((zus?.arrears.amount ?? 0) * 100), debtAsOf: zus?.arrears.checkedAt ?? '', debtArrangementCurrent: false,
    // Ubezpieczenie ustało w ciąży z przyczyny z art. 30 ustawy zasiłkowej → wymaga dokumentów, nie automatycznej odmowy.
    disputedInsurance: false, verified: false,
    specialAfterInsurance:
      zus?.sickness.endReason === 'liquidation' ? 'liquidation'
        : zus?.sickness.endReason === 'bankruptcy' ? 'bankruptcy'
          : zus?.sickness.endReason === 'unlawful_termination' ? 'court'
            : zus?.sickness.endReason === 'employer_death' ? 'unknown'
              : 'none',
    applicantRole: profile.me.gender === 'male' ? 'father' : 'mother', lossDate: child.loss?.date ?? '',
  });
}
export function newApplication(profile: Profile, owner: string, child: Child, today: string, id: string, at: string): ApplicationDraft {
  const me = profile.me;
  const facts = defaultFacts(profile, child, today);
  return ApplicationDraftSchema.parse({
    id, owner, childId: child.id, caseId: `MANUAL-${id}`, formId: 'ZAM', formVersion: FORM_VERSION, createdAt: at, updatedAt: at,
    status: 'draft', facts, recipient: me.employment === 'employment_contract' ? 'employer' : me.employment === 'self_employed' || me.employment === 'civil_contract' ? 'zus' : 'unknown',
    attachmentsConfirmed: false, signatureConfirmed: false, history: [{ at, action: 'Utworzono szkic' }],
    values: {
      [applicant.firstName.id]: me.firstName, [applicant.lastName.id]: me.lastName, [applicant.pesel.id]: me.pesel,
      [applicant.street.id]: me.street, [applicant.house.id]: me.houseNumber, [applicant.postal.id]: me.postalCode, [applicant.city.id]: me.city,
      [payer.name.id]: me.work?.zus?.payer.name, [payer.nip.id]: me.work?.zus?.payer.nip,
      [childDetails.basic.id]: [child.name, child.birthDate].filter(Boolean).join(', '),
      [reasons.birth.id]: child.status === 'born' ? '1' : undefined,
      [reasons.expected.id]: child.status === 'expected' ? '1' : undefined,
      [childDetails.due.id]: child.status === 'expected' ? child.dueDate : undefined,
      [statements.otherFirstName.id]: profile.partner?.firstName, [statements.otherLastName.id]: profile.partner?.lastName, [statements.otherPesel.id]: profile.partner?.pesel,
    },
  });
}

/** Fields tied to the evaluated period are generated once, at validation. */
export function evaluatedFormValues(draft: ApplicationDraft) {
  const f = draft.facts;
  const range = `${f.start.split('-').reverse().join('.')} – ${f.end.split('-').reverse().join('.')}`;
  const values = { ...draft.values };
  for (const field of Object.values(leaves)) delete values[field.id];
  for (const field of [leaveDates.maternity, leaveDates.parental, leaveDates.paternity, leaveDates.supplementary]) delete values[field.id];
  const selection = f.kind === 'parental' ? [leaves.rodzicielski, leaveDates.parental] : f.kind === 'paternity' ? [leaves.ojcowski, leaveDates.paternity] : f.kind === 'supplementary' ? [leaves.uzupełniający, leaveDates.supplementary] : f.kind === 'adoption' || f.kind === 'foster' ? [leaves.naWarunkach, leaveDates.maternity] : [leaves.macierzyński, leaveDates.maternity];
  values[selection[0].id] = '1'; values[selection[1].id] = range;
  values[statements.signedOn.id] = f.applicationDate;
  if (f.kind === 'parental') values[leaveDates.parentalPart.id] = String(f.part);
  if (f.kind === 'paternity') values[leaveDates.paternityPart.id] = String(f.part);
  return values;
}
export function validateApplication(draft: ApplicationDraft): string[] {
  const issues: string[] = [];
  const parsed = ApplicationDraftSchema.safeParse(draft);
  if (!parsed.success) return parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
  for (const field of [applicant.firstName, applicant.lastName, applicant.street, applicant.house, applicant.postal, applicant.city]) {
    if (!draft.values[field.id]?.trim()) issues.push(`Uzupełnij: ${field.label}`);
  }
  const pesel = draft.values[applicant.pesel.id];
  if (pesel ? !isValidPesel(pesel) : !draft.values[applicant.identity.id] || !draft.values[applicant.birthDate.id]) issues.push('Podaj poprawny PESEL albo dokument tożsamości i datę urodzenia.');
  if (!/^\d{2}-\d{3}$/.test(draft.values[applicant.postal.id] ?? '')) issues.push('Kod pocztowy: wymagany format 00-000.');
  if (!draft.values[childDetails.basic.id]?.trim()) issues.push('Uzupełnij dane dziecka.');
  if (draft.recipient === 'unknown') issues.push('Ustal odbiorcę wniosku.');
  if (!draft.attachmentsConfirmed) issues.push('Potwierdź kompletność wymaganych dokumentów.');
  if (!draft.signatureConfirmed) issues.push('Potwierdź dane i podpis wyłącznie na potrzeby symulacji.');
  if (draft.formId === 'ZAM' && (draft.formVersion !== FORM_VERSION || draft.facts.applicationDate < '2026-10-24')) issues.push('Ten wzór ZAM obowiązuje od 24.10.2026. Dobierz historyczny formularz.');
  if (draft.formId !== 'USC') {
    const result = evaluateApplication(draft.facts);
    if (result.status !== 'eligible') issues.push(...result.reasons, ...result.missing);
  }
  return [...new Set(issues)];
}
export function changeDraft(draft: ApplicationDraft, patch: Partial<Pick<ApplicationDraft, 'values' | 'facts' | 'evidence' | 'caseId' | 'formId' | 'recipient' | 'attachmentsConfirmed' | 'signatureConfirmed'>>, at: string): ApplicationDraft {
  if (draft.status === 'simulated_submitted') throw new Error('Złożony zapis jest niezmienny. Utwórz nowy szkic.');
  return { ...draft, ...patch, status: 'draft', pdfRevision: undefined, updatedAt: at };
}
export function validateDraft(draft: ApplicationDraft, at: string): ApplicationDraft {
  const errors = validateApplication(draft);
  if (errors.length) throw new Error(errors.join('\n'));
  if (draft.status === 'simulated_submitted') throw new Error('Zapis jest już złożony.');
  return { ...draft, values: evaluatedFormValues(draft), status: 'validated', updatedAt: at, pdfRevision: undefined, history: [...draft.history, { at, action: 'Zweryfikowano dane' }] };
}
export function markPdfReady(draft: ApplicationDraft, revision: string, at: string): ApplicationDraft {
  if (draft.status !== 'validated' || draft.updatedAt !== revision || validateApplication(draft).length) throw new Error('Dane zmieniły się. Zweryfikuj i wygeneruj PDF ponownie.');
  return { ...draft, status: 'ready', pdfRevision: revision, history: [...draft.history, { at, action: 'Wygenerowano PDF' }] };
}
export function submitSimulation(draft: ApplicationDraft, owner: string, confirmed: boolean, at: string): ApplicationDraft {
  if (draft.owner !== owner || !confirmed || draft.status !== 'ready' || !draft.pdfRevision || draft.pdfRevision !== draft.updatedAt || validateApplication(draft).length) throw new Error('Wymagane są aktualna walidacja, PDF i potwierdzenie odbiorcy.');
  return { ...draft, status: 'simulated_submitted', submissionId: `DEMO-${draft.id}`, submittedAt: at, history: [...draft.history, { at, action: 'Złożono w symulacji – nie wysłano do urzędu' }] };
}
