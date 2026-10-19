import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.astro/**',
      '**/node_modules/**',
      'coverage/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.config.{js,mjs,ts}', 'scripts/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['functions/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker } },
  },
);
