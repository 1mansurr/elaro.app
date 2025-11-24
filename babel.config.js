module.exports = function (api) {
  // FIXED: Use function-based cache instead of api.cache(true) to avoid conflict with api.env()
  // This prevents "Caching has already been configured" error during bundling
  api.cache(() => process.env.NODE_ENV);
  
  // Check if we're running Jest tests
  const isTest = api.env('test');
  
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
      // Only add these plugins for Jest compatibility (not for Metro bundling)
      // These plugins transform ES modules to CommonJS, which conflicts with Metro
      ...(isTest ? [
      ['@babel/plugin-transform-modules-commonjs', { loose: true }],
      ['@babel/plugin-transform-export-namespace-from'],
      ] : []),
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
