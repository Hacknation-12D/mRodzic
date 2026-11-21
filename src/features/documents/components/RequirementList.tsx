import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { goToProfile } from '@/core/navigation/routes';
import type { RequirementResult, RuleResult } from '@/core/types';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

const WHO_ORDER: RequirementResult['who'][] = ['me', 'partner', 'anyParent', 'child', 'household'];

const ICON: Record<RuleResult, 'checkmark-circle' | 'close-circle' | 'help-circle'> = {
  met: 'checkmark-circle',
  unmet: 'close-circle',
  unknown: 'help-circle',
};

const RESULT_LABEL: Record<RuleResult, string> = {
  met: pl.documents.requirementMet,
  unmet: pl.documents.requirementUnmet,
  unknown: pl.documents.requirementUnknown,
};

/** Wymagania pogrupowane wg „kogo dotyczą”, z wynikiem met / unmet / unknown. */
export function RequirementList({ results }: { results: RequirementResult[] }) {
  const c = useThemeColors();
  const color = (r: RuleResult) => (r === 'met' ? c.success : r === 'unmet' ? c.error : c.warning);

  if (results.length === 0) return <AppText tone="muted">{pl.documents.noRequirements}</AppText>;

  return (
    <View className="gap-3">
      {WHO_ORDER.map((who) => {
        const items = results.filter((r) => r.who === who);
        if (items.length === 0) return null;
        return (
          <View key={who} className="gap-2">
            <AppText variant="caption" tone="muted">
              {pl.documents.who[who].toUpperCase()}
            </AppText>
            {items.map((r) => (
              <View key={r.id} className="flex-row items-start gap-2" accessible accessibilityLabel={`${r.label}: ${RESULT_LABEL[r.result]}`}>
                <Ionicons name={ICON[r.result]} size={22} color={color(r.result)} />
                <View className="flex-1 gap-0.5">
                  <AppText>{r.label}</AppText>
                  <AppText variant="small" tone={r.result === 'met' ? 'success' : r.result === 'unmet' ? 'danger' : 'warning'}>
                    {RESULT_LABEL[r.result]}
                  </AppText>
                  {r.result === 'unknown' ? (
                    <Pressable onPress={goToProfile} accessibilityRole="link" className="min-h-7 justify-center" hitSlop={6}>
                      <AppText variant="small" tone="primary" className="underline">
                        {pl.documents.completeProfile}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

