import { pl } from '../../shared/i18n/pl';
import type { Stage } from '../types';

/** „28. tydzień ciąży”, „4. miesiąc życia”, „2 lata i 4 miesiące”. */
export function stageLabel(stage: Stage): string {
  switch (stage.kind) {
    case 'pregnancy':
      return stage.overdue ? pl.stage.overdue(stage.week) : pl.stage.pregnancyWeek(stage.week);
    case 'newborn':
      return pl.stage.newbornWeek(stage.weeks);
    case 'infant':
      return pl.stage.infantMonth(stage.months);
    case 'toddler':
      return pl.stage.yearsMonths(Math.floor(stage.months / 12), stage.months % 12);
    case 'preschool':
    case 'school':
      return pl.stage.yearsMonths(stage.years, stage.months);
  }
}
