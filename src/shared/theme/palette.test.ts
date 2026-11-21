import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { darkColors, lightColors, type ThemeColors } from './palette';

const css = readFileSync(path.resolve(__dirname, '../../global.css'), 'utf8');

const camel = (token: string) => token.replace(/-([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

/** Wyciąga tokeny --color-* z bloku `@variant <name> { … }` w global.css. */
function tokens(variant: 'light' | 'dark'): Record<string, string> {
  const start = css.indexOf(`@variant ${variant} {`);
  const end = css.indexOf('}', start);
  const block = css.slice(start, end);
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) out[camel(m[1])] = m[2].trim();
  return out;
}

describe('motyw DaisyUI: global.css ↔ palette.ts', () => {
  for (const [name, palette] of [
    ['light', lightColors],
    ['dark', darkColors],
  ] as const) {
    it(`tokeny ${name} są identyczne w CSS i w JS`, () => {
      const fromCss = tokens(name);
      expect(Object.keys(fromCss).sort()).toEqual(Object.keys(palette).sort());
      for (const key of Object.keys(palette) as (keyof ThemeColors)[]) {
        expect(fromCss[key], key).toBe(palette[key]);
      }
    });
  }
});
