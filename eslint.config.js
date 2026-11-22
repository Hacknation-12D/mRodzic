// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const FEATURES = ['onboarding', 'profile', 'calendar', 'assistant', 'documents', 'home', 'calculator', 'settings'];

/**
 * Architektura (README → „Reguły granic”):
 * - features/<X> importuje tylko @/core/**, @/shared/** i własne pliki,
 * - core nie importuje z features ani dev,
 * - shared nie importuje z core ani z features.
 */
const featureBoundaries = FEATURES.map((feature) => {
  const others = FEATURES.filter((f) => f !== feature);
  return {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: others.flatMap((o) => [`@/features/${o}`, `@/features/${o}/**`, `**/features/${o}`, `**/features/${o}/**`, `../../${o}`, `../../${o}/**`, `../${o}`, `../${o}/**`]),
              message: `Feature "${feature}" nie może importować innych funkcji. Użyj @/core (store'y, routes) albo @/shared.`,
            },
            {
              group: ['@/dev', '@/dev/**', '**/dev/**'],
              message: 'Funkcje nie importują z src/dev.',
            },
          ],
        },
      ],
    },
  };
});

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/functions/**', 'ios/*', 'android/*'],
  },
  ...featureBoundaries,
  {
    files: ['src/core/**/*.{ts,tsx}'],
    // Testy mogą korzystać z danych testowych z src/dev (np. dummyData).
    ignores: ['src/core/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/features', '@/features/**', '**/features/**'], message: 'core nie importuje z features.' },
            { group: ['@/dev', '@/dev/**', '**/dev/**'], message: 'core nie importuje z dev.' },
          ],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/core', '@/core/**', '**/core/**'], message: 'shared nie importuje z core – przekaż dane przez propsy.' },
            { group: ['@/features', '@/features/**', '**/features/**'], message: 'shared nie importuje z features.' },
          ],
        },
      ],
    },
  },
]);
