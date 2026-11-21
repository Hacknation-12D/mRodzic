import { create } from 'zustand';

import { CHILD_COLOR_KEYS } from '@/core/profile/childColors';
import type { Child, ChildColorKey, Gender, Parent, Profile } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { createId } from '@/shared/lib/id';

import type { MObywatelIdentity } from './mobywatel/mObywatelService';

export type DraftParent = Omit<Parent, 'id'>;

export type DraftChild = {
  key: string;
  name: string;
  status: 'expected' | 'born';
  dueDate?: string;
  birthDate?: string;
  sex?: Child['sex'];
  premature?: boolean;
  disability?: boolean;
  multipleBirthGroupId?: string;
  /** Czy użytkownik coś już wpisał (przy „Dodaj bliźniaka” nie nadpisujemy wypełnionego dziecka). */
  touched: boolean;
};

export type DraftHousehold = {
  city: string;
  /** undefined = wartość wyliczona automatycznie. */
  size?: number;
  incomeText: string;
  /** undefined = wyliczone z braku partnera. */
  singleParent?: boolean;
};

export type IdentitySource = 'manual' | 'mobywatel';

type State = {
  /** Skąd pochodzą dane rodzica – steruje komunikatem w kroku „Twoje dane”. */
  identitySource: IdentitySource;
  me: DraftParent;
  childrenCount: number;
  partnerEnabled: boolean;
  partner: DraftParent;
  children: DraftChild[];
  currentChild: number;
  household: DraftHousehold;
  setMe: (me: DraftParent) => void;
  /** Uzupełnia dane rodzica i miejscowość z symulacji mObywatela. */
  applyMObywatelIdentity: (identity: MObywatelIdentity) => void;
  setChildrenCount: (n: number) => void;
  setPartnerEnabled: (enabled: boolean) => void;
  setPartner: (partner: DraftParent) => void;
  updateChild: (index: number, patch: Partial<DraftChild>) => void;
  setCurrentChild: (index: number) => void;
  addTwin: (index: number) => void;
  setHousehold: (patch: Partial<DraftHousehold>) => void;
  reset: () => void;
};

export const MAX_CHILDREN = 10;

export const colorForIndex = (index: number): ChildColorKey => CHILD_COLOR_KEYS[index % CHILD_COLOR_KEYS.length];

function blankChild(index: number, count: number): DraftChild {
  // Ostatnie dziecko domyślnie „w drodze” – najczęstszy przypadek przy pierwszym uruchomieniu.
  return { key: createId('draft_'), name: '', status: index === count - 1 ? 'expected' : 'born', touched: false };
}

function resize(children: DraftChild[], n: number): DraftChild[] {
  // Nietknięte dzieci dostają domyślny status na nowo (zależy od tego, które jest ostatnie).
  const next = children.slice(0, n).map((c, i) => (c.touched ? c : { ...blankChild(i, n), key: c.key }));
  while (next.length < n) next.push(blankChild(next.length, n));
  return next;
}

const initial = () => ({
  identitySource: 'manual' as IdentitySource,
  me: { firstName: '', gender: 'female' as Gender },
  childrenCount: 1,
  partnerEnabled: false,
  partner: { firstName: '', gender: 'male' as Gender },
  children: resize([], 1),
  currentChild: 0,
  household: { city: '', incomeText: '' },
});

/** Szkic onboardingu – NIE persistowany. Zapisywany do profilu dopiero po kroku 4. */
export const useOnboardingDraft = create<State>()((set) => ({
  ...initial(),
  setMe: (me) => set((state) => ({
    me,
    household: { ...state.household, city: me.city ?? state.household.city },
  })),
  applyMObywatelIdentity: (identity) =>
    set((s) => ({
      identitySource: 'mobywatel',
      me: { ...s.me, firstName: identity.firstName, lastName: s.me.lastName ?? identity.lastName, gender: identity.gender },
      household: { ...s.household, city: identity.city },
    })),
  setChildrenCount: (n) =>
    set((s) => {
      const count = Math.max(1, Math.min(MAX_CHILDREN, n));
      return { childrenCount: count, children: resize(s.children, count), currentChild: Math.min(s.currentChild, count - 1) };
    }),
  setPartnerEnabled: (partnerEnabled) => set({ partnerEnabled }),
  setPartner: (partner) => set({ partner }),
  updateChild: (index, patch) =>
    set((s) => ({ children: s.children.map((c, i) => (i === index ? { ...c, ...patch, touched: true } : c)) })),
  setCurrentChild: (currentChild) => set({ currentChild }),
  addTwin: (index) =>
    set((s) => {
      const source = s.children[index];
      if (!source || s.children.length >= MAX_CHILDREN) return s;
      const groupId = source.multipleBirthGroupId ?? createId('twins_');
      const twin: DraftChild = {
        key: createId('draft_'),
        name: '',
        status: source.status,
        dueDate: source.dueDate,
        birthDate: source.birthDate,
        premature: source.premature,
        multipleBirthGroupId: groupId,
        touched: true,
      };
      const children = s.children.map((c, i) => (i === index ? { ...c, multipleBirthGroupId: groupId, touched: true } : c));
      const nextChild = children[index + 1];
      if (nextChild && !nextChild.touched) children[index + 1] = twin;
      else children.splice(index + 1, 0, twin);
      return { children, childrenCount: Math.max(s.childrenCount, children.length), currentChild: index + 1 };
    }),
  setHousehold: (patch) => set((s) => ({ household: { ...s.household, ...patch } })),
  reset: () => set(initial()),
}));

export function computedHouseholdSize(draft: Pick<State, 'partnerEnabled' | 'children'>): number {
  return 1 + (draft.partnerEnabled ? 1 : 0) + draft.children.filter((c) => c.status === 'born').length;
}

export function parseIncome(text: string): number | undefined {
  const n = Number(text.replace(/\s/g, '').replace(',', '.'));
  return text.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

/** Zamienia szkic w Profile (walidacja dat odbywa się w krokach). */
export function buildProfileFromDraft(draft: State, nowIso: string): Profile {
  const children: Child[] = draft.children.map((c, i) => {
    const born = c.status === 'born';
    const name = c.name.trim() || (born ? pl.anonymize.child(i + 1) : pl.childForm.defaultExpectedName);
    return {
      id: createId('child_'),
      name,
      status: c.status,
      ...(born ? { birthDate: c.birthDate } : { dueDate: c.dueDate }),
      sex: c.sex,
      premature: born ? (c.premature ?? false) : undefined,
      disability: born ? c.disability : undefined,
      multipleBirthGroupId: c.multipleBirthGroupId,
      colorKey: colorForIndex(i),
    };
  });
  const income = parseIncome(draft.household.incomeText);
  return {
    schemaVersion: 1,
    me: { ...draft.me, id: createId('parent_'), firstName: draft.me.firstName.trim() },
    partner: draft.partnerEnabled
      ? { ...draft.partner, id: createId('parent_'), firstName: draft.partner.firstName.trim() }
      : undefined,
    children,
    household: {
      city: draft.household.city.trim() || undefined,
      size: draft.household.size,
      incomePerPersonNet: income,
      singleParent: draft.household.singleParent ?? !draft.partnerEnabled,
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
