import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { estimateBenefitFromProfile } from '@/core/benefits';
import { useToday } from '@/core/clock/useToday';
import {
  goToAssistant,
  goToCalculator,
  goToChildEdit,
  goToChildNew,
  goToDocuments,
  goToOnboardingStep,
  goToProfile,
} from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import { useChildViews } from '@/core/profile/useChildViews';
import { pl } from '@/shared/i18n/pl';
import { formatLongDate, isoToPolishDate } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { useThemeColors } from '@/shared/theme';
import { ActionTile, AppText, Button, Card, ChildDot, IconBadge, Screen, SectionHeader } from '@/shared/ui';

const t = pl.home;

function weeksLabel(n: number) {
  return `${Math.round(n)} tyg.`;
}

export function HomeScreen() {
  const profile = useProfileStore((state) => state.profile);
  const today = useToday();
  const children = useChildViews(today);
  const colors = useThemeColors();
  const estimate = useMemo(() => (profile ? estimateBenefitFromProfile(profile, today) : null), [profile, today]);

  return (
    <Screen>
      {/* Powitanie */}
      <Card tone="tinted" elevation={0} className="overflow-hidden p-5 md:p-7">
        <View pointerEvents="none" className="absolute -right-10 -top-12 size-44 rounded-full bg-primary opacity-10" />
        <View pointerEvents="none" className="absolute -bottom-16 right-16 size-32 rounded-full bg-primary opacity-5" />
        <AppText variant="caption" tone="primary" className="uppercase tracking-wide">
          {formatLongDate(today)}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {t.greeting(profile?.me.firstName)}
        </AppText>
        <AppText tone="muted">{t.subtitle}</AppText>
      </Card>

      <View className="gap-4 md:flex-row md:items-stretch">
        {/* Zasiłek – podgląd kalkulatora */}
        <Card elevation={2} className="gap-4 p-5 md:flex-1">
          <View className="flex-row items-center gap-3">
            <IconBadge icon="calculator-outline" />
            <AppText variant="subheading" className="flex-1" accessibilityRole="header">
              {t.benefitTitle}
            </AppText>
          </View>
          {estimate?.status === 'eligible' && estimate.monthly !== undefined ? (
            <View className="gap-1">
              <AppText variant="caption" tone="muted" className="uppercase tracking-wide">
                {t.benefitMonthly}
              </AppText>
              <AppText variant="display" tone="primary">
                {formatMoney(estimate.monthly, 0)}
              </AppText>
              {estimate.endDate ? (
                <AppText variant="small" tone="muted">
                  {t.benefitWeeks(weeksLabel(estimate.weeks), isoToPolishDate(estimate.endDate))}
                </AppText>
              ) : null}
            </View>
          ) : (
            <AppText tone="muted">
              {!profile || !estimate ? t.benefitNoProfile : estimate.status === 'not_eligible' ? t.benefitNotEligible : t.benefitUnknown}
            </AppText>
          )}
          <View className="flex-1" />
          <Button label={t.openCalculator} icon="arrow-forward" onPress={goToCalculator} />
        </Card>

        {/* Skróty */}
        <View className="gap-3 md:flex-1">
          <SectionHeader title={t.shortcuts} />
          <ActionTile icon="chatbubbles-outline" title={t.assistantTile} description={t.assistantTileBody} onPress={() => goToAssistant()} />
          <ActionTile icon="document-text-outline" tone="info" title={t.documentsTile} description={t.documentsTileBody} onPress={goToDocuments} />
          {profile ? (
            <ActionTile icon="person-circle-outline" tone="neutral" title={t.profileTile} description={t.profileTileBody} onPress={goToProfile} />
          ) : null}
        </View>
      </View>

      {/* Dzieci */}
      <SectionHeader
        title={t.childrenTitle}
        action={profile ? <Button compact variant="secondary" icon="add" label={t.addChild} onPress={goToChildNew} /> : undefined}
      />
      <Card className="gap-1 p-2">
        {children.length > 0 ? (
          children.map((child, i) => (
            <Pressable
              key={child.id}
              onPress={() => goToChildEdit(child.id)}
              accessibilityRole="button"
              accessibilityLabel={`${child.name}, ${child.stageLabel}`}
              accessibilityHint={t.openChildHint}
              className={`min-h-16 flex-row items-center gap-3 rounded-field px-3 py-2 active:bg-base-200 ${i > 0 ? 'border-t border-base-300' : ''}`}>
              <ChildDot name={child.name} color={child.color} size={42} />
              <View className="flex-1 gap-0.5">
                <AppText variant="bodyStrong">{child.name}</AppText>
                <AppText variant="small" tone="muted">
                  {child.stageLabel}
                  {child.insured !== undefined ? ` · ${child.insured ? pl.profile.insured : pl.profile.notInsured}` : ''}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.baseContentMuted} />
            </Pressable>
          ))
        ) : (
          <View className="items-start gap-3 p-3">
            <IconBadge icon="people-outline" tone="neutral" />
            <View className="gap-1">
              <AppText variant="bodyStrong">{profile ? t.childrenEmptyTitle : t.profileNeededTitle}</AppText>
              <AppText tone="muted">{profile ? t.childrenEmptyBody : t.profileNeededBody}</AppText>
            </View>
            <Button
              label={profile ? t.addChild : t.createProfile}
              icon={profile ? 'add' : 'person-add-outline'}
              variant="secondary"
              onPress={profile ? goToChildNew : () => goToOnboardingStep('login')}
              className="self-stretch"
            />
          </View>
        )}
      </Card>
    </Screen>
  );
}
