module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
          },
        },
      ],
      // Add these plugins for better Jest compatibility
      ['@babel/plugin-transform-modules-commonjs', { loose: true }],
      ['@babel/plugin-transform-export-namespace-from'],
      // Remove console.log in production builds (keep console.error and console.warn)
      ...(process.env.NODE_ENV === 'production'
        ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
        : []),
      // This plugin is required for react-native-reanimated v2+
      // Must be last in the plugins array
      'react-native-reanimated/plugin',
    ],
  };
};
