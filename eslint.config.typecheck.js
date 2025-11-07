/**
 * ESLint configuration with type-checking rules
 * This config enables strict TypeScript type-checking rules
 *
 * Usage: eslint --config eslint.config.typecheck.js src/
 */

const tseslint = require('typescript-eslint');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/',
      'ios/',
      'android/',
      'supabase/functions/',
      'coverage/',
      'dist/',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Type-checking rules - enabled as warnings initially
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn',

      // Prevent any types
      '@typescript-eslint/no-explicit-any': 'error',

      // Type safety rules
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
    },
  },
];
