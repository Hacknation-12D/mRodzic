import { TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '../lib/cn';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

type Props = Omit<TextInputProps, 'style' | 'className'> & {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  optionalLabel?: string;
};

/** DaisyUI: fieldset + label + input input-bordered (błąd: input-error). */
export function TextField({ label, hint, error, optional, optionalLabel, multiline, ...rest }: Props) {
  const c = useThemeColors();
  return (
    <View className="gap-1">
      <AppText variant="bodyStrong">
        {label}
        {optional && optionalLabel ? <AppText tone="muted"> {optionalLabel}</AppText> : null}
      </AppText>
      <TextInput
        {...rest}
        multiline={multiline}
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={c.baseContentMuted}
        className={cn(
          'min-h-11 rounded-field border bg-base-100 px-3 py-2 text-[15px] leading-[21px] text-base-content',
          error ? 'border-error' : 'border-base-300',
          multiline && 'min-h-24 align-top',
        )}
      />
      {error ? (
        <AppText variant="small" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
