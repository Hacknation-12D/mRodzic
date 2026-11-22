import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { useToday } from '@/core/clock/useToday';
import { goToAssistant, goToChildEdit, goToChildNew, goToDocuments, goToOnboardingStep } from '@/core/navigation/routes';
import { useProfileStore } from '@/core/profile/profile.store';
import { useChildViews } from '@/core/profile/useChildViews';
import { pl } from '@/shared/i18n/pl';
import { useThemeColors } from '@/shared/theme';
import { AppText, Button, Card, ChildDot, Screen } from '@/shared/ui';

export function HomeScreen() {
  const profile = useProfileStore((state) => state.profile);
  const children = useChildViews(useToday());
  const colors = useThemeColors();

  return (
    <Screen>
      <Card className="w-full gap-6 self-center p-5 md:max-w-4xl md:p-6">
        <View className="gap-6 md:flex-row">
          <View className="gap-5 md:flex-1">
            <View className="gap-2">
              <AppText variant="title" accessibilityRole="header">
                {pl.home.greeting(profile?.me.firstName)}
              </AppText>
              <AppText tone="muted">{pl.home.subtitle}</AppText>
            </View>

            <View className="gap-3">
              <Button
                label={pl.home.openAssistant}
                icon="chatbubbles-outline"
                onPress={goToAssistant}
                className="min-h-14"
              />
              <Button
                label={pl.home.openDocuments}
                icon="document-text-outline"
                onPress={goToDocuments}
                className="min-h-14"
              />
            </View>
          </View>

          <View className="gap-3 md:flex-1">
            <AppText variant="heading" accessibilityRole="header">
              {pl.home.childrenTitle}
            </AppText>

            {children.length > 0 ? (
              <View className="gap-2">
                {children.map((child) => (
                  <Pressable
                    key={child.id}
                    onPress={() => goToChildEdit(child.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${child.name}, ${child.stageLabel}`}
                    accessibilityHint={pl.home.openChildHint}
                    className="min-h-14 flex-row items-center gap-3 rounded-field border border-base-300 bg-base-200 px-3 active:opacity-80">
                    <ChildDot name={child.name} color={child.color} size={40} />
                    <View className="flex-1 gap-0.5">
                      <AppText variant="bodyStrong">{child.name}</AppText>
                      <AppText variant="small" tone="muted">
                        {child.stageLabel}
                      </AppText>
                      {child.insured !== undefined ? (
                        <AppText variant="small" tone="muted">
                          {child.insured ? pl.profile.insured : pl.profile.notInsured}
                        </AppText>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.baseContentMuted} />
                  </Pressable>
                ))}
              </View>
            ) : (
              <View className="items-start gap-2 rounded-field bg-base-200 p-4">
                <Ionicons name="people-outline" size={28} color={colors.baseContentMuted} />
                <AppText variant="bodyStrong">
                  {profile ? pl.home.childrenEmptyTitle : pl.home.profileNeededTitle}
                </AppText>
                <AppText tone="muted">
                  {profile ? pl.home.childrenEmptyBody : pl.home.profileNeededBody}
                </AppText>
                <Button
                  label={profile ? pl.home.addChild : pl.home.createProfile}
                  icon={profile ? 'add' : 'person-add-outline'}
                  variant="secondary"
                  onPress={profile ? goToChildNew : () => goToOnboardingStep('login')}
                  className="min-h-14 self-stretch"
                />
              </View>
            )}
          </View>
        </View>
      </Card>
    </Screen>
  );
}
