import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageSwitcher } from './PageSwitcher';
import { ThemeSwitch } from './ThemeSwitch';

type Props = {
  hasProfile: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function PreviewControls({ hasProfile, isDark, onToggleTheme }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        {
          right: insets.right + 16,
          bottom: insets.bottom + 16,
        },
      ]}>
      <ThemeSwitch isDark={isDark} onToggle={onToggleTheme} />
      <PageSwitcher hasProfile={hasProfile} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 30,
    elevation: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
