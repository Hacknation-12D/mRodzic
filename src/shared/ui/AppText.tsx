import { Text, type TextProps } from 'react-native';

import { cn } from '../lib/cn';

export type TypographyVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'small' | 'caption';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  tone?: 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'warning' | 'inverse';
};

const VARIANT: Record<TypographyVariant, string> = {
  display: 'text-[34px] leading-[40px] font-extrabold tracking-tight',
  title: 'text-[26px] leading-8 font-extrabold tracking-tight',
  heading: 'text-xl leading-[26px] font-bold tracking-tight',
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
