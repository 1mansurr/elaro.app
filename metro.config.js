const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add minification optimizations for better bundle size
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
  compress: {
    drop_console: false, // Keep console logs for debugging
    drop_debugger: true,
    pure_funcs: ['console.log', 'console.info', 'console.debug'],
  },
};

// Add tree shaking for better bundle optimization
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize asset handling
config.resolver.assetExts.push('svg', 'ttf', 'otf', 'woff', 'woff2');

module.exports = config;
