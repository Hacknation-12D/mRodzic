import { getFamilySupabase } from '@/core/supabase/client';
import type { Child, Profile } from '@/core/types';

import { applicant, childDetails, reasons, zamLeave, type ZamValues } from '@/core/applications/forms/zamFields';

type ParentData = {
  first_name: string;
  last_name: string | null;
  pesel: string | null;
  birth_date: string | null;
  street: string | null;
  house_number: string | null;
  apartment_number: string | null;
  postal_code: string | null;
  city: string | null;
};
export type ZamChild = {
  child_id: string;
  name: string;
  last_name: string | null;
  status: Child['status'];
  birth_date: string | null;
  birth_place: string | null;
  due_date: string | null;
};

export async function loadZamProfile() {
  const client = getFamilySupabase();
  if (!client) return { status: 'offline' } as const;
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError || !session) return { status: 'signed-out' } as const;
  const { data, error } = await client.from('family_parents')
    .select('first_name,last_name,pesel,birth_date,street,house_number,apartment_number,postal_code,city,family_children(child_id,name,last_name,status,birth_date,birth_place,due_date)')
    .eq('user_id', session.user.id)
    .maybeSingle<ParentData & { family_children: ZamChild[] }>();
  if (error) return { status: 'error' } as const;
  if (!data) return { status: 'empty' } as const;
  return { status: 'loaded', parent: data, children: data.family_children } as const;
}

export function localZamParent(profile: Profile): ParentData {
  const { me, household } = profile;
  return {
    first_name: me.firstName, last_name: me.lastName ?? null, pesel: me.pesel ?? null,
    birth_date: me.birthDate ?? null, street: me.street ?? null, house_number: me.houseNumber ?? null,
    apartment_number: me.apartmentNumber ?? null, postal_code: me.postalCode ?? household.postalCode ?? null,
    city: me.city ?? household.city ?? null,
  };
}

export function localZamChild(child: Child): ZamChild {
  return { child_id: child.id, name: child.name, last_name: null, status: child.status, birth_date: child.birthDate ?? null, birth_place: null, due_date: child.dueDate ?? null };
}

export function zamChildValues(child: ZamChild | undefined, docId: string, parent?: Pick<ParentData, 'last_name' | 'city'>): ZamValues {
  const born = child?.status === 'born';
  const expected = child?.status === 'expected' && docId === 'urlop-macierzynski';
  const hospital = born && docId === 'dodatkowy-urlop-wczesniak';
  const date = child?.birth_date?.split('-').reverse().join('.');
  const lastName = child?.last_name?.trim() || parent?.last_name?.trim() || '[nazwisko]';
  const birthPlace = child?.birth_place?.trim() || parent?.city?.trim() || '[miejsce urodzenia]';
  const partial = born ? `${child.name} ${lastName}, ${date ?? '[data urodzenia]'}, ${birthPlace}` : undefined;
  return {
    [reasons.birth.id]: born && !hospital ? '1' : undefined,
    [reasons.expected.id]: expected ? '1' : undefined,
    [reasons.hospital.id]: hospital ? '1' : undefined,
    [childDetails.due.id]: expected ? child.due_date ?? undefined : undefined,
    [childDetails.basic.id]: hospital ? undefined : partial,
    [childDetails.hospital.id]: hospital ? partial : undefined,
  };
}

export function zamChildValuesFromForm(child: ZamChild | undefined, docId: string, values: ZamValues) {
  return zamChildValues(child, docId, {
    last_name: values[applicant.lastName.id] ?? null,
    city: values[applicant.city.id] ?? null,
  });
}

export function zamInitialValues(docId: string, parent?: ParentData, child?: ZamChild): ZamValues {
  const leave = zamLeave(docId);
  return {
    ...(leave ? { [leave.id]: '1' } : {}),
    [applicant.firstName.id]: parent?.first_name,
    [applicant.lastName.id]: parent?.last_name ?? undefined,
    [applicant.pesel.id]: parent?.pesel ?? undefined,
    [applicant.birthDate.id]: parent?.pesel ? undefined : parent?.birth_date ?? undefined,
    [applicant.street.id]: parent?.street ?? undefined,
    [applicant.house.id]: parent?.house_number ?? undefined,
    [applicant.apartment.id]: parent?.apartment_number ?? undefined,
    [applicant.postal.id]: parent?.postal_code ?? undefined,
    [applicant.city.id]: parent?.city ?? undefined,
    ...zamChildValues(child, docId, parent),
  };
}
