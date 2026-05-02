module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // nativewind v4 babel plugin for class name processing
      'nativewind/babel',
    ],
  };
};
