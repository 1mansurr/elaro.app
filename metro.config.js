const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Only add minification optimizations in production builds
// Minification can cause bundling errors in development
if (process.env.NODE_ENV === 'production') {
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
}

// Add tree shaking for better bundle optimization
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Optimize asset handling
config.resolver.assetExts.push('svg', 'ttf', 'otf', 'woff', 'woff2');

// Get the default source extensions and add support for .mjs and .cjs
const defaultSourceExts = config.resolver.sourceExts || [];
config.resolver.sourceExts = [
  ...defaultSourceExts,
  'mjs', // Add .mjs for ES modules
  'cjs', // Add .cjs for CommonJS modules
];

// Add transformer configuration to handle module formats
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  }),
};

module.exports = config;
