import { useState } from 'react';
import { View } from 'react-native';

import { defaultHouseholdSize } from '@/core/rules/buildFacts';
import type { Profile } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, Card, Stepper, TextField, ToggleRow } from '@/shared/ui';

type Props = {
  profile: Profile;
  onSave: (household: Profile['household']) => void;
};

export function HouseholdCard({ profile, onSave }: Props) {
  const h = profile.household;
  const computedSize = defaultHouseholdSize(profile);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(h.city ?? '');
  const [size, setSize] = useState(h.size ?? computedSize);
  const [incomeText, setIncomeText] = useState(h.incomePerPersonNet?.toString() ?? '');
  const [singleParent, setSingleParent] = useState(h.singleParent ?? !profile.partner);

  const startEdit = () => {
    setCity(h.city ?? '');
    setSize(h.size ?? computedSize);
    setIncomeText(h.incomePerPersonNet?.toString() ?? '');
    setSingleParent(h.singleParent ?? !profile.partner);
    setEditing(true);
  };

  const save = () => {
    const n = Number(incomeText.replace(/\s/g, '').replace(',', '.'));
    onSave({
      ...h,
      city: city.trim() || undefined,
      size: size === computedSize && h.size === undefined ? undefined : size,
      incomePerPersonNet: incomeText.trim() && Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined,
      singleParent,
    });
    setEditing(false);
  };

  return (
    <Card>
      <AppText variant="subheading" accessibilityRole="header">
        {pl.profile.household}
      </AppText>
      {editing ? (
        <View className="gap-3">
          <TextField label={pl.onboarding.household.city} optional optionalLabel={pl.common.optional} value={city} onChangeText={setCity} />
          <Stepper label={pl.onboarding.household.size} hint={pl.onboarding.household.sizeHint} value={size} min={1} max={30} onChange={setSize} />
          <TextField
            label={pl.onboarding.household.income}
            optional
            optionalLabel={pl.common.optional}
            hint={pl.onboarding.household.incomeHint}
            keyboardType="numeric"
            value={incomeText}
            onChangeText={setIncomeText}
          />
          <ToggleRow label={pl.onboarding.household.singleParent} value={singleParent} onChange={setSingleParent} />
          <View className="flex-row gap-2">
            <Button label={pl.common.cancel} variant="ghost" onPress={() => setEditing(false)} className="flex-1" />
            <Button label={pl.common.save} onPress={save} className="flex-1" />
          </View>
        </View>
      ) : (
        <>
          <AppText>{pl.profile.householdSummary(h.size ?? computedSize, h.incomePerPersonNet)}</AppText>
          {h.city ? <AppText tone="muted">{h.city}</AppText> : null}
          {h.singleParent ?? !profile.partner ? <AppText tone="muted">{pl.onboarding.household.singleParent}</AppText> : null}
          <Button label={pl.common.edit} variant="secondary" icon="create-outline" onPress={startEdit} compact />
        </>
      )}
    </Card>
  );
}

