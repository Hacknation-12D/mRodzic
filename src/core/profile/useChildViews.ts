import { useMemo } from 'react';

import { useIsDark } from '../../shared/theme/colors';
import { getStage } from '../stage/getStage';
import { stageLabel } from '../stage/stageLabel';
import type { Child, ChildColorKey, MarkKey, Profile, Stage } from '../types';
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
      stageLabel: stageLabel(stage),
    };
  });
}

/** Dzieci z kolorem (dopasowanym do motywu) i etapem na podany dzień. */
export function useChildViews(date: Date): ChildView[] {
  const profile = useProfileStore((s) => s.profile);
  const isDark = useIsDark();
  return useMemo(() => toChildViews(profile, date, isDark), [profile, date, isDark]);
}

/** Kolor dla klucza znacznika (dziecko albo „cała rodzina”) w bieżącym motywie. */
export function useMarkColor(): (key: MarkKey) => string {
  const isDark = useIsDark();
  return (key) => getChildColor(key, isDark);
}
