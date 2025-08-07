module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier', // Must be last to override other configs
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint/eslint-plugin'],
  rules: {
    // You can add custom rules here if needed
    'react/react-in-jsx-scope': 'off', // Not needed with modern React
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
