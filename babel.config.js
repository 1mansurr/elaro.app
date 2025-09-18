module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // This plugin is required for react-native-reanimated v2+
      // Must be last in the plugins array
      'react-native-reanimated/plugin',
    ],
  };
};
