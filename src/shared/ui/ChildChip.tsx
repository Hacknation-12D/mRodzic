import { View } from 'react-native';

import { AppText } from './AppText';
import { Chip } from './Chip';

/**
 * Chip dziecka: kolor + inicjał + imię (kolor nigdy nie jest jedynym nośnikiem informacji).
 * Dane wyłącznie przez propsy – shared/ui nie czyta store'ów.
 */
type Props = {
  name: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
  /** Tryb kompaktowy: tylko kropka z inicjałem + imię, bez ramki. */
  compact?: boolean;
  accessibilityLabel?: string;
};

/** Czarny albo biały inicjał – zależnie od jasności koloru dziecka (czytelność w trybie ciemnym). */
function initialColor(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return '#FFFFFF';
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#141311' : '#FFFFFF';
}

export function ChildDot({ name, color, size = 18 }: { name: string; color: string; size?: number }) {
  return (
    <View className="items-center justify-center" style={{ backgroundColor: color, width: size, height: size, borderRadius: size / 2 }}>
      <AppText
        className="font-extrabold"
        style={{ color: initialColor(color), fontSize: size * 0.55, lineHeight: size * 0.75 }}>
        {name.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

export function ChildChip({ name, color, selected, onPress, compact, accessibilityLabel }: Props) {
  if (compact) {
    return (
      <View className="flex-row items-center gap-1 self-start rounded-selector bg-neutral-soft px-2 py-0.5" accessibilityLabel={accessibilityLabel ?? name}>
        <ChildDot name={name} color={color} size={16} />
        <AppText variant="caption" tone="muted">
          {name}
        </AppText>
      </View>
    );
  }
  return (
    <Chip
      label={name}
      selected={selected}
      onPress={onPress}
      color={color}
      accessibilityLabel={accessibilityLabel}
      leading={<ChildDot name={name} color={color} />}
    />
  );
}

