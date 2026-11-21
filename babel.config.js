module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    '@babel/plugin-transform-export-namespace-from', // zod v4 uses `export * as ns`
    [
      'module:react-native-dotenv',
      { moduleName: '@env', path: '.env', safe: false, allowUndefined: true },
    ],
  ],
};
