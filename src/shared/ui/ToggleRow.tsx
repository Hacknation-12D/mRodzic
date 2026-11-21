import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { AppText } from './AppText';

type Props = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  hint?: string;
};

/** DaisyUI: toggle toggle-primary. */
export function ToggleRow({ label, value, onChange, hint }: Props) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      className="min-h-11 flex-row items-center gap-3">
      <View className="flex-1 gap-0.5">
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="small" tone="muted">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View className={cn('h-7 w-12 justify-center rounded-selector border px-0.5', value ? 'border-primary bg-primary' : 'border-base-300 bg-neutral-soft')}>
        <View className={cn('size-5 rounded-full', value ? 'self-end bg-primary-content' : 'self-start bg-base-content-muted')} />
      </View>
    </Pressable>
  );
}
