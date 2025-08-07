const globals = require('globals');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/', 'ios/', 'android/', 'supabase/functions/'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules, // Disables rules that conflict with Prettier
      'react/react-in-jsx-scope': 'off', // Not needed with modern React
      'react/prop-types': 'off', // Not needed in TypeScript projects
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
