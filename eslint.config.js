import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/dist-e2e/**', '**/node_modules/**', 'coverage/**', 'test-results/**', 'playwright-report/**', 'plans/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js', 'vitest.config.ts', 'playwright.config.ts', 'shared/vitest.config.ts', 'server/vitest.config.ts', 'server/scripts/*.mjs', 'client/scripts/*.mjs'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    files: ['server/**/*.ts', 'server/**/*.mjs', 'client/scripts/**/*.mjs', 'tools/**/*.mjs', 'prototypes/**/*.mjs', 'shared/**/*.ts', '*.js', '*.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tools/pixellab/generate.mjs'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['client/src/**/*.ts'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['**/*.js', '**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
