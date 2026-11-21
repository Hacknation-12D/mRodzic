import { useState } from 'react';
import { View } from 'react-native';

import { useToday } from '@/core/clock/useToday';
import { goToOnboardingStep } from '@/core/navigation/routes';
import { childFormErrors, hasErrors } from '@/core/profile/childValidation';
import { pl } from '@/shared/i18n/pl';
import { AppText, Button, Screen } from '@/shared/ui';

import { ChildForm } from '../components/ChildForm';
import { StepProgress } from '../components/StepProgress';
import { MAX_CHILDREN, useOnboardingDraft } from '../onboardingDraft.store';

/** Kreator „Dziecko 1 z N”. */
export function StepChildren() {
  const today = useToday();
  const children = useOnboardingDraft((s) => s.children);
  const index = useOnboardingDraft((s) => s.currentChild);
  const setIndex = useOnboardingDraft((s) => s.setCurrentChild);
  const updateChild = useOnboardingDraft((s) => s.updateChild);
  const addTwin = useOnboardingDraft((s) => s.addTwin);
  const [showErrors, setShowErrors] = useState(false);

  const child = children[index];
  if (!child) return null;
  const errors = childFormErrors(child, today);
  const isLast = index === children.length - 1;

  const next = () => {
    if (hasErrors(errors)) return setShowErrors(true);
    setShowErrors(false);
    if (isLast) goToOnboardingStep('household');
    else setIndex(index + 1);
  };

  return (
    <Screen keyboard>
      <StepProgress step={3} total={4} title={pl.onboarding.children.title} />
      <AppText variant="heading" accessibilityRole="header">
        {pl.onboarding.children.childOf(index + 1, children.length)}
      </AppText>
      <ChildForm
        key={child.key}
        index={index}
        value={child}
        onChange={(patch) => updateChild(index, patch)}
        onAddTwin={() => addTwin(index)}
        errors={showErrors ? errors : undefined}
        canAddTwin={children.length < MAX_CHILDREN}
      />
      <View className="mt-3 flex-row gap-3">
        {index > 0 ? (
          <Button
            label={pl.onboarding.children.prevChild}
            variant="ghost"
            icon="arrow-back"
            onPress={() => {
              setShowErrors(false);
              setIndex(index - 1);
            }}
            className="flex-1"
          />
        ) : null}
        <Button
          label={isLast ? pl.common.next : pl.onboarding.children.nextChild}
          icon="arrow-forward"
          onPress={next}
          className="flex-1"
        />
      </View>
    </Screen>
  );
}

