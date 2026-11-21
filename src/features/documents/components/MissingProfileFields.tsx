import { useState } from 'react';

import { useProfileStore } from '@/core/profile/profile.store';
import { buildFacts, type Facts } from '@/core/rules/buildFacts';
import { evaluate } from '@/core/rules/evaluate';
import { EmploymentSchema, HouseholdSchema } from '@/core/schemas/profile';
import type { Child, DocumentInstance, FactKey, Parent, Profile, Rule } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, Card, Select, TextField } from '@/shared/ui';

function collectMissing(rule: Rule, facts: Facts, keys: Set<FactKey>) {
  if (evaluate(rule, facts) !== 'unknown') return;
  if ('all' in rule || 'any' in rule) {
    for (const nested of 'all' in rule ? rule.all : rule.any) collectMissing(nested, facts, keys);
  } else if ('not' in rule) {
    collectMissing(rule.not, facts, keys);
  } else {
    keys.add(rule.fact);
  }
}

function HouseholdField({ field }: { field: 'incomePerPersonNet' | 'city' }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  const updateHousehold = useProfileStore((state) => state.updateHousehold);
  const income = field === 'incomePerPersonNet';

  function save() {
    const input = value.trim();
    const amount = /^\d+(?:[,.]\d{1,2})?$/.test(input) ? Number(input.replace(',', '.')) : NaN;
    const parsed = HouseholdSchema.shape[field].safeParse(income ? amount : input);
    if (!input || !parsed.success) {
      setError(income ? 'Podaj kwotę od 0 do 1 000 000 zł.' : 'Podaj miejscowość (do 80 znaków).');
      return;
    }
    if (typeof parsed.data === 'number') updateHousehold({ incomePerPersonNet: parsed.data });
    if (typeof parsed.data === 'string') updateHousehold({ city: parsed.data });
  }

  return (
    <>
      <TextField
        label={income ? 'Miesięczny dochód netto na osobę (zł)' : 'Miejscowość'}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setError(undefined);
        }}
        inputMode={income ? 'decimal' : 'text'}
        error={error}
      />
      <Button label={pl.common.save} onPress={save} />
    </>
  );
}

const employmentOptions = EmploymentSchema.options.map((value) => ({ value, label: pl.employment[value] }));
const booleanOptions = [{ value: 'yes', label: pl.common.yes }, { value: 'no', label: pl.common.no }] as const;

export function MissingProfileFields({ instance, profile, child, today }: {
  instance: DocumentInstance;
  profile: Profile;
  child: Child | null;
  today: Date;
}) {
  const { updateMe, setPartner, updateChild } = useProfileStore.getState();
  const facts = buildFacts(profile, child, today);
  const missing = new Set<FactKey>();
  for (const requirement of instance.requirements) collectMissing(requirement.rule, facts, missing);

  function employmentField(parent: Parent, role: 'me' | 'partner') {
    if (parent.employment || !(missing.has(`${role}.employment`) || missing.has('anyParent.employment'))) return null;
    return (
      <Select
        key={role}
        label={`${pl.parentForm.employment} – ${parent.firstName}`}
        value={parent.employment}
        options={employmentOptions}
        onChange={(employment) => {
          if (!employment) return;
          if (role === 'me') updateMe({ employment });
          else setPartner({ ...parent, employment });
        }}
      />
    );
  }

  const fields = [
    employmentField(profile.me, 'me'),
    profile.partner ? employmentField(profile.partner, 'partner') : null,
    missing.has('household.incomePerPersonNet') && facts['household.incomePerPersonNet'] === undefined
      ? <HouseholdField key="income" field="incomePerPersonNet" /> : null,
    missing.has('household.city') && facts['household.city'] === undefined
      ? <HouseholdField key="city" field="city" /> : null,
    ...(['premature', 'disability'] as const).map((field) => {
      const fact = `child.${field}` as const;
      if (!child || !missing.has(fact) || facts[fact] !== undefined) return null;
      return (
        <Select
          key={field}
          label={field === 'premature' ? 'Czy dziecko urodziło się przedwcześnie?' : 'Czy dziecko ma orzeczenie o niepełnosprawności?'}
          value={undefined}
          options={[...booleanOptions]}
          onChange={(value) => {
            if (value) updateChild(child.id, { [field]: value === 'yes' });
          }}
        />
      );
    }),
  ];

  if (!fields.some(Boolean)) return null;
  return (
    <Card>
      <AppText variant="subheading" accessibilityRole="header">{pl.documents.missingData}</AppText>
      <AppText tone="muted">Uzupełnione dane zapiszą się w profilu na tym urządzeniu.</AppText>
      {fields}
    </Card>
  );
}
