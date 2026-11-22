import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cn } from '../lib/cn';
import { useElevation, useThemeColors, type ThemeColors } from '../theme';
import { AppText } from './AppText';

type IconName = ComponentProps<typeof Ionicons>['name'];
export type IconTone = 'primary' | 'info' | 'warning' | 'success' | 'error' | 'neutral';

const TONE_BG: Record<IconTone, string> = {
  primary: 'bg-primary-soft',
  info: 'bg-info-soft',
  warning: 'bg-warning-soft',
  success: 'bg-success-soft',
  error: 'bg-error-soft',
  neutral: 'bg-neutral-soft',
};

function toneColor(c: ThemeColors, tone: IconTone): string {
  switch (tone) {
    case 'primary':
      return c.primary;
    case 'info':
      return c.info === c.accent ? c.baseContent : c.info;
    case 'warning':
      return c.warning;
    case 'success':
      return c.success;
    case 'error':
      return c.error;
    default:
      return c.baseContentMuted;
  }
}

/** Ikona w zaokrąglonym, kolorowym kafelku – wspólny „język” ikon w całej aplikacji. */
export function IconBadge({ icon, tone = 'primary', size = 44 }: { icon: IconName; tone?: IconTone; size?: number }) {
  const c = useThemeColors();
  return (
    <View
      className={cn('shrink-0 items-center justify-center rounded-field', TONE_BG[tone])}
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={toneColor(c, tone)} />
    </View>
  );
}

type ActionTileProps = {
  icon: IconName;
  title: string;
  description?: string;
  onPress: () => void;
  tone?: IconTone;
  /** Mały znacznik obok tytułu (np. „Nowe”). */
  badge?: string;
  className?: string;
};

/** Klikalny kafelek: ikona + tytuł + opis + strzałka. Na stronie głównej i w listach skrótów. */
export function ActionTile({ icon, title, description, onPress, tone = 'primary', badge, className }: ActionTileProps) {
  const c = useThemeColors();
  const shadow = useElevation(1);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      className={cn('min-h-20 flex-row items-center gap-3 rounded-box border border-base-300 bg-base-100 p-4 active:opacity-85', className)}
      style={shadow}>
      <IconBadge icon={icon} tone={tone} />
      <View className="min-w-0 flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <AppText variant="subheading">{title}</AppText>
          {badge ? (
            <View className="rounded-selector bg-primary-soft px-2 py-0.5">
              <AppText variant="caption" tone="primary">
                {badge}
              </AppText>
            </View>
          ) : null}
        </View>
        {description ? (
          <AppText variant="small" tone="muted">
            {description}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.baseContentMuted} />
    </Pressable>
  );
}

/** Nagłówek sekcji z opcjonalną akcją po prawej. */
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3 px-1">
      <View className="min-w-0 flex-1 gap-0.5">
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="muted">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

/** Liczba z podpisem (np. kwota, liczba tygodni). `emphasis` = większa, w kolorze marki. */
export function StatTile({ label, value, hint, emphasis, className }: { label: string; value: string; hint?: string; emphasis?: boolean; className?: string }) {
  return (
    <View
      className={cn('min-w-36 flex-1 gap-1 rounded-field p-4', emphasis ? 'bg-primary-soft' : 'border border-base-300 bg-base-100', className)}
      accessible
      accessibilityLabel={`${label}: ${value}${hint ? `, ${hint}` : ''}`}>
      <AppText variant="caption" tone="muted" className="uppercase tracking-wide">
        {label}
      </AppText>
      <AppText variant={emphasis ? 'display' : 'heading'} tone={emphasis ? 'primary' : 'default'}>
        {value}
      </AppText>
      {hint ? (
        <AppText variant="small" tone="muted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

type ChoiceTileProps = {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  /** Dodatkowa treść pod opisem (np. kwota). */
  children?: ReactNode;
  className?: string;
  /** „stacked” = ikona i znacznik wyboru u góry, tekst pod spodem (wąskie kafelki w siatce). */
  layout?: 'row' | 'stacked';
};

/** Kafelek wyboru (radio): wyraźna ramka i cień, gdy zaznaczony. */
export function ChoiceTile({ title, description, icon, selected, onPress, children, className, layout = 'row' }: ChoiceTileProps) {
  const c = useThemeColors();
  const shadow = useElevation(selected ? 2 : 0);
  const radio = <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? c.primary : c.baseContentMuted} />;
  const text = (
    <View className="gap-0.5">
      <AppText variant="bodyStrong">{title}</AppText>
      {description ? (
        <AppText variant="small" tone="muted">
          {description}
        </AppText>
      ) : null}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      className={cn(
        'gap-2 rounded-box border-2 p-4 active:opacity-85',
        selected ? 'border-primary bg-base-100' : 'border-base-300 bg-base-200',
        className,
      )}
      style={shadow}>
      {layout === 'stacked' ? (
        <>
          <View className="flex-row items-start justify-between gap-2">
            {icon ? <IconBadge icon={icon} tone={selected ? 'primary' : 'neutral'} size={40} /> : <View />}
            {radio}
          </View>
          {text}
        </>
      ) : (
        <View className="flex-row items-start gap-3">
          {icon ? <IconBadge icon={icon} tone={selected ? 'primary' : 'neutral'} size={40} /> : null}
          <View className="min-w-0 flex-1">{text}</View>
          {radio}
        </View>
      )}
      {children}
    </Pressable>
  );
}
