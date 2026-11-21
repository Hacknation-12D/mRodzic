import { useState } from 'react';
import { View } from 'react-native';

import { goToOnboardingStep } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { Button, Screen, ToggleRow } from '@/shared/ui';

import { isParentValid, ParentForm } from '../components/ParentForm';
import { StepProgress } from '../components/StepProgress';
import { useOnboardingDraft } from '../onboardingDraft.store';

export function StepPartner() {
  const enabled = useOnboardingDraft((s) => s.partnerEnabled);
  const setEnabled = useOnboardingDraft((s) => s.setPartnerEnabled);
  const partner = useOnboardingDraft((s) => s.partner);
  const setPartner = useOnboardingDraft((s) => s.setPartner);
  const [showErrors, setShowErrors] = useState(false);

  const next = () => {
    if (enabled && !isParentValid(partner)) return setShowErrors(true);
    goToOnboardingStep('children');
  };
  const skip = () => {
    setEnabled(false);
    goToOnboardingStep('children');
  };

  return (
    <Screen keyboard>
      <StepProgress step={2} total={4} title={pl.onboarding.partner.title} intro={pl.onboarding.partner.intro} />
      <ToggleRow label={pl.onboarding.partner.toggle} value={enabled} onChange={setEnabled} />
      {enabled ? <ParentForm value={partner} onChange={setPartner} showErrors={showErrors} /> : null}
      <View className="mt-3 flex-row gap-3">
        <Button label={pl.common.skip} variant="ghost" onPress={skip} className="flex-1" />
        <Button label={pl.common.next} icon="arrow-forward" onPress={next} className="flex-1" />
      </View>
    </Screen>
  );
}

