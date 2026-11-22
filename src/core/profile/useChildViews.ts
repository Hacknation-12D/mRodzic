import { useMemo } from 'react';

import { pl } from '../../shared/i18n/pl';
import { isoToPolishDate } from '../../shared/lib/date';
import { useIsDark } from '../../shared/theme/colors';
import { getStage } from '../stage/getStage';
import { stageLabel } from '../stage/stageLabel';
import type { Child, ChildColorKey, Profile, Stage } from '../types';
import { getChildColor } from './childColors';
import { useProfileStore } from './profile.store';

export type ChildView = {
  id: string;
  name: string;
  status: Child['status'];
  colorKey: ChildColorKey;
  color: string;
  stage: Stage;
  stageLabel: string;
  insured?: boolean;
  /** Martwe urodzenie / zgon – zamiast wieku pokazujemy datę. */
  loss?: Child['loss'];
};

export function toChildViews(profile: Profile | null, date: Date, isDark: boolean): ChildView[] {
  if (!profile) return [];
  return profile.children.map((c) => {
    const stage = getStage(c, date);
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      colorKey: c.colorKey,
      color: getChildColor(c.colorKey, isDark),
      stage,
      stageLabel: c.loss ? pl.loss.label(c.loss.kind, isoToPolishDate(c.loss.date)) : stageLabel(stage),
      insured: c.loss ? undefined : c.insured,
      loss: c.loss,
    };
  });
}

/** Dzieci z kolorem (dopasowanym do motywu) i etapem na podany dzień. */
export function useChildViews(date: Date): ChildView[] {
  const profile = useProfileStore((s) => s.profile);
  const isDark = useIsDark();
  return useMemo(() => toChildViews(profile, date, isDark), [profile, date, isDark]);
}

