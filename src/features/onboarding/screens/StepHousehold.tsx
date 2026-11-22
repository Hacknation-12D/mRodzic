import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { goToHome } from '@/core/navigation/routes';
import { useToday } from '@/core/clock/useToday';
import { getChildColor } from '@/core/profile/childColors';
import { useProfileStore } from '@/core/profile/profile.store';
import { getStage } from '@/core/stage/getStage';
import { stageLabel } from '@/core/stage/stageLabel';
import { pl } from '@/shared/i18n/pl';
import { useIsDark } from '@/shared/theme';
import { AppText, Button, Card, ChildChip, Screen, Stepper, TextField, ToggleRow } from '@/shared/ui';

import { StepProgress } from '../components/StepProgress';
import {
  buildProfileFromDraft,
  colorForIndex,
  computedHouseholdSize,
  onboardingStepsTotal,
  useOnboardingDraft,
} from '../onboardingDraft.store';

export function StepHousehold() {
  const today = useToday();
  const isDark = useIsDark();
  const draft = useOnboardingDraft();
  const setProfile = useProfileStore((s) => s.setProfile);
  const { household, setHousehold } = draft;

  // Szkic czyścimy dopiero po opuszczeniu ekranu – inaczej ekran na chwilę renderuje pusty szkic
  // (z „Maluszkiem”) i da się zapisać profil bez daty dziecka.
  const finished = useRef(false);
  useEffect(
    () => () => {
      if (finished.current) useOnboardingDraft.getState().reset();
    },
    [],
  );

  const total = onboardingStepsTotal(draft);

  const size = household.size ?? computedHouseholdSize(draft);
  const singleParent = household.singleParent ?? !draft.partnerEnabled;
  const preview = buildProfileFromDraft(draft, today.toISOString());

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    setProfile(buildProfileFromDraft(useOnboardingDraft.getState(), new Date().toISOString()));
    goToHome();
    useOnboardingDraft.getState().reset();
  };

  return (
    <Screen keyboard>
      <Card className="w-full gap-5 self-center p-5 md:max-w-4xl md:p-6">
        <StepProgress step={total} total={total} title={pl.onboarding.household.title} intro={pl.onboarding.household.intro} />
        <TextField
          label={pl.onboarding.household.city}
          optional
          optionalLabel={pl.common.optional}
          value={household.city}
          onChangeText={(city) => setHousehold({ city })}
          textContentType="addressCity"
        />
        <Stepper
          label={pl.onboarding.household.size}
          hint={pl.onboarding.household.sizeHint}
          value={size}
          min={1}
          max={30}
          onChange={(n) => setHousehold({ size: n })}
        />
        <ToggleRow label={pl.onboarding.household.singleParent} value={singleParent} onChange={(v) => setHousehold({ singleParent: v })} />

        <Card className="items-center">
          <AppText variant="subheading" accessibilityRole="header" className="text-center">
            {pl.onboarding.household.summary}
          </AppText>
          <AppText className="text-center">
            {preview.me.firstName} · {pl.gender[preview.me.gender]}
            {preview.me.employment ? ` · ${pl.employment[preview.me.employment]}` : ''}
          </AppText>
          {preview.partner ? (
            <AppText className="text-center">
              {preview.partner.firstName} · {pl.gender[preview.partner.gender]}
              {preview.partner.employment ? ` · ${pl.employment[preview.partner.employment]}` : ''}
            </AppText>
          ) : null}
          {preview.children.map((c, i) => {
            const hasDate = c.birthDate ?? c.dueDate;
            return (
              <View key={draft.children[i]?.key ?? c.id} className="flex-row items-center justify-center gap-2">
                <ChildChip compact name={c.name} color={getChildColor(colorForIndex(i), isDark)} />
                {hasDate ? (
                  <AppText variant="small" tone="muted">
                    {stageLabel(getStage(c, today))}
                  </AppText>
                ) : null}
              </View>
            );
          })}
          <AppText variant="small" tone="muted" className="text-center">
            {pl.profile.householdSummary(size, preview.household.incomePerPersonNet)}
          </AppText>
        </Card>

        <AppText variant="small" tone="muted" className="text-center">
          {pl.onboarding.household.privacy}
        </AppText>
        <Button label={pl.onboarding.household.start} icon="checkmark" onPress={finish} />
      </Card>
    </Screen>
  );
}
