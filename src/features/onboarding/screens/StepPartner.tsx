import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { goToOnboardingStep } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { cn } from '@/shared/lib/cn';
import { useThemeColors } from '@/shared/theme';
import { AppText, Button, Screen } from '@/shared/ui';

import { isParentValid, ParentForm } from '../components/ParentForm';
import { StepProgress } from '../components/StepProgress';
import { onboardingStepsTotal, useOnboardingDraft } from '../onboardingDraft.store';

type IconName = ComponentProps<typeof Ionicons>['name'];
const t = pl.onboarding.partner;

type ChoiceProps = {
  label: string;
  hint: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
};

/** Duży, wycentrowany blok wyboru (Tak / Nie). */
function Choice({ label, hint, icon, selected, onPress }: ChoiceProps) {
  const c = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      className={cn(
        'min-h-36 flex-1 items-center justify-center gap-2 rounded-box border-2 p-4 active:opacity-80',
        selected ? 'border-primary bg-primary-soft' : 'border-base-300 bg-base-100',
      )}>
      <Ionicons name={icon} size={36} color={selected ? c.primary : c.baseContentMuted} />
      <AppText variant="subheading" className="text-center">
        {label}
      </AppText>
      <AppText variant="small" tone="muted" className="text-center">
        {hint}
      </AppText>
    </Pressable>
  );
}

export function StepPartner() {
  const enabled = useOnboardingDraft((s) => s.partnerEnabled);
  const setEnabled = useOnboardingDraft((s) => s.setPartnerEnabled);
  const partner = useOnboardingDraft((s) => s.partner);
  const setPartner = useOnboardingDraft((s) => s.setPartner);
  const childrenImported = useOnboardingDraft((s) => s.childrenSource === 'mobywatel');
  const total = useOnboardingDraft(onboardingStepsTotal);
  const [showErrors, setShowErrors] = useState(false);

  // Dzieci pobrane z mObywatela → pomijamy krok ręcznego dodawania.
  const after = () => goToOnboardingStep(childrenImported ? 'household' : 'children');

  const chooseNo = () => {
    setEnabled(false);
    after();
  };
  const next = () => {
    if (!isParentValid(partner)) return setShowErrors(true);
    after();
  };

  return (
    <Screen keyboard contentClassName="grow justify-center">
      <View className="w-full gap-5 self-center md:max-w-xl">
        <StepProgress step={1} total={total} title={t.title} intro={t.intro} center />
        <View className="flex-row gap-3" accessibilityRole="radiogroup">
          <Choice label={t.yes} hint={t.yesHint} icon="people-outline" selected={enabled} onPress={() => setEnabled(true)} />
          <Choice label={t.no} hint={t.noHint} icon="person-outline" selected={false} onPress={chooseNo} />
        </View>
        {enabled ? (
          <>
            <ParentForm value={partner} onChange={setPartner} showErrors={showErrors} />
            <Button label={pl.common.next} icon="arrow-forward" onPress={next} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
