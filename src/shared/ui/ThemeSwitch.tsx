import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type Props = {
  isDark: boolean;
  onToggle: () => void;
};

/** Floating, app-wide switch for previewing the light and dark themes. */
export function ThemeSwitch({ isDark, onToggle }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityLabel="Theme switch"
      accessibilityHint="Changes between light and dark theme."
      accessibilityState={{ checked: isDark }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.control,
        {
          right: insets.right + 16,
          bottom: insets.bottom + 16,
          backgroundColor: colors.base100,
          borderColor: colors.base300,
          opacity: pressed ? 0.82 : 1,
        },
      ]}>
      <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.primary} />
      <AppText variant="small" tone="default" className="font-semibold">
        Theme
      </AppText>
      <View style={[styles.track, { backgroundColor: isDark ? colors.primary : colors.base300 }]}>
        <View style={[styles.thumb, { alignSelf: isDark ? 'flex-end' : 'flex-start', backgroundColor: colors.base100 }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  control: {
    position: 'absolute',
    zIndex: 20,
    elevation: 8,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  track: {
    width: 34,
    height: 20,
    justifyContent: 'center',
    padding: 2,
    borderRadius: 10,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
