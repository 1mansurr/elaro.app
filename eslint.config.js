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
      
      // UI/UX Custom Rules: Component Usage Enforcement
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/Button', '**/SimplifiedButton', '**/BaseButton', '**/ButtonVariants'],
              message: 'Use UnifiedButton or specific variants (PrimaryButton, SecondaryButton, etc.) instead of old button imports',
            },
            {
              group: ['**/Input', '**/SimplifiedInput'],
              message: 'Use UnifiedInput instead of old input imports',
            },
          ],
        },
      ],
      
      // UI/UX Custom Rules: Hardcoded Colors Prevention (using no-restricted-syntax)
      // Note: Custom rule 'no-hardcoded-colors' removed as it's not a valid ESLint rule
      
      // Prevent hardcoded typography values
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Property[key.name="fontWeight"] > Literal[value=/^(bold|normal|100|200|300|400|500|600|700|800|900)$/]',
          message: 'Use FONT_WEIGHTS constants instead of hardcoded font weights',
        },
        {
          selector: 'Property[key.name="fontSize"] > Literal[value=/^[0-9]+$/]',
          message: 'Use FONT_SIZES constants instead of hardcoded font sizes',
        },
        {
          selector: 'Property[key.name="color"] > Literal[value=/^#[0-9a-fA-F]{3,6}$/]',
          message: 'Use COLORS constants instead of hardcoded colors',
        },
        {
          selector: 'Property[key.name=/^(padding|margin|paddingTop|paddingBottom|paddingLeft|paddingRight|marginTop|marginBottom|marginLeft|marginRight)$/] > Literal[value=/^[0-9]+$/]',
          message: 'Use SPACING constants instead of hardcoded spacing values',
        },
        {
          selector: 'Property[key.name="lineHeight"] > Literal[value=/^[0-9]+$/]',
          message: 'Use calculated line heights or LINE_HEIGHT constants',
        },
        {
          selector: 'Property[key.name="letterSpacing"] > Literal[value=/^-?[0-9]+$/]',
          message: 'Use LETTER_SPACING constants instead of hardcoded letter spacing',
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];
