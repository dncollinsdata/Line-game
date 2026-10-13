/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  setupFiles: ['react-native-gesture-handler/jestSetup.js', './jest.setup.js'],
  // Reanimated 4 needs the worklets JS implementation under Jest.
  resolver: 'react-native-worklets/jest/resolver.js',
};
