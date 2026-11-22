import { useState } from 'react';
import { View } from 'react-native';

import { defaultHouseholdSize } from '@/core/rules/buildFacts';
import type { Profile } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, Card, Stepper, ToggleRow } from '@/shared/ui';

type Props = {
  profile: Profile;
  onSave: (household: Profile['household']) => void;
};

/**
 * Gospodarstwo domowe. Miejscowość wynika z adresu zamieszkania, a dochód na osobę – z danych o zarobkach
 * rodziców (PUE/eZUS), więc oba pola są tylko do odczytu. Edytowalne: liczba osób i samotne wychowywanie.
 */
export function HouseholdCard({ profile, onSave }: Props) {
  const h = profile.household;
  const computedSize = defaultHouseholdSize(profile);
  const [editing, setEditing] = useState(false);
  const [size, setSize] = useState(h.size ?? computedSize);
  const [singleParent, setSingleParent] = useState(h.singleParent ?? !profile.partner);

  const startEdit = () => {
    setSize(h.size ?? computedSize);
    setSingleParent(h.singleParent ?? !profile.partner);
    setEditing(true);
  };

  const save = () => {
    onSave({
      ...h,
      size: size === computedSize && h.size === undefined ? undefined : size,
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
          <Stepper label={pl.onboarding.household.size} hint={pl.onboarding.household.sizeHint} value={size} min={1} max={30} onChange={setSize} />
          <ToggleRow label={pl.onboarding.household.singleParent} value={singleParent} onChange={setSingleParent} />
          <View className="flex-row gap-2">
            <Button label={pl.common.cancel} variant="ghost" onPress={() => setEditing(false)} className="flex-1" />
            <Button label={pl.common.save} onPress={save} className="flex-1" />
          </View>
        </View>
      ) : (
        <>
          <AppText>{pl.profile.householdSummary(h.size ?? computedSize, h.incomePerPersonNet)}</AppText>
          {h.incomePerPersonNet !== undefined ? (
            <AppText variant="small" tone="muted">
              {pl.profile.incomeFromRegistry}
            </AppText>
          ) : null}
          {h.singleParent ?? !profile.partner ? <AppText tone="muted">{pl.onboarding.household.singleParent}</AppText> : null}
          <Button label={pl.common.edit} variant="secondary" icon="create-outline" onPress={startEdit} compact />
        </>
      )}
    </Card>
  );
}
