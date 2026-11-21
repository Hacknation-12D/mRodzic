import { describe, expect, it } from 'vitest';

import { darkColors, lightColors } from '../../shared/theme/palette';
import { CHILD_COLOR_KEYS, CHILD_PALETTE, contrastRatio, nextChildColor } from './childColors';

describe('childColors', () => {
  it.each(CHILD_COLOR_KEYS)('%s has contrast ≥ 3:1 in light and dark mode', (key) => {
    expect(contrastRatio(CHILD_PALETTE[key].light, lightColors.base200)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(CHILD_PALETTE[key].light, lightColors.base100)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(CHILD_PALETTE[key].dark, darkColors.base200)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(CHILD_PALETTE[key].dark, darkColors.base100)).toBeGreaterThanOrEqual(3);
  });

  it('assigns the first free color', () => {
    expect(nextChildColor([])).toBe('coral');
    expect(nextChildColor([{ colorKey: 'coral' }, { colorKey: 'violet' }])).toBe('teal');
  });
});
