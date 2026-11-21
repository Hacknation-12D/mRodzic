import { Text, type TextProps } from 'react-native';

import { cn } from '../lib/cn';

export type TypographyVariant = 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'caption';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'warning' | 'inverse';
};

const VARIANT: Record<TypographyVariant, string> = {
  title: 'text-[24px] leading-[30px] font-bold',
  heading: 'text-[19px] leading-6 font-bold',
  subheading: 'text-base leading-[22px] font-semibold',
  body: 'text-[15px] leading-[21px]',
  bodyStrong: 'text-[15px] leading-[21px] font-semibold',
  small: 'text-[13px] leading-[18px]',
  caption: 'text-xs leading-4 font-medium',
};

const TONE: Record<NonNullable<AppTextProps['tone']>, string> = {
  default: 'text-base-content',
  muted: 'text-base-content-muted',
  primary: 'text-primary',
  danger: 'text-error',
  success: 'text-success',
  warning: 'text-warning',
  inverse: 'text-primary-content',
};

export function AppText({ variant = 'body', tone = 'default', className, ...rest }: AppTextProps) {
  return <Text {...rest} className={cn(VARIANT[variant], TONE[tone], className)} />;
}
