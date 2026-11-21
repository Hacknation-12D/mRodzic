import { useState } from 'react';
import { View } from 'react-native';

import { goToOnboardingStep } from '@/core/navigation/routes';
import { pl } from '@/shared/i18n/pl';
import { Alert, Button, Screen, Stepper } from '@/shared/ui';

import { isParentValid, ParentForm } from '../components/ParentForm';
import { StepProgress } from '../components/StepProgress';
import { MAX_CHILDREN, useOnboardingDraft } from '../onboardingDraft.store';

export function StepMe() {
  const me = useOnboardingDraft((s) => s.me);
  const fromMObywatel = useOnboardingDraft((s) => s.identitySource === 'mobywatel');
  const setMe = useOnboardingDraft((s) => s.setMe);
  const childrenCount = useOnboardingDraft((s) => s.childrenCount);
  const setChildrenCount = useOnboardingDraft((s) => s.setChildrenCount);
  const [showErrors, setShowErrors] = useState(false);

  const next = () => {
    if (!isParentValid(me)) return setShowErrors(true);
    goToOnboardingStep('partner');
  };

  return (
    <Screen keyboard>
      <StepProgress step={1} total={4} title={pl.onboarding.me.title} intro={pl.onboarding.me.intro} />
      {fromMObywatel ? (
        <Alert tone="success" title={pl.onboarding.login.importedTitle}>
          {pl.onboarding.login.importedBody}
        </Alert>
      ) : null}
      <ParentForm value={me} onChange={setMe} showErrors={showErrors} showIdentity />
      <Stepper
        label={pl.onboarding.me.childrenCount}
        hint={pl.onboarding.me.childrenCountHint}
        value={childrenCount}
        min={1}
        max={MAX_CHILDREN}
        onChange={setChildrenCount}
      />
      <View className="mt-3">
        <Button label={pl.common.next} onPress={next} icon="arrow-forward" />
      </View>
    </Screen>
  );
}

