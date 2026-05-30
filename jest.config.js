/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // RNTL v13+ registers its matchers automatically — no extend-expect setup needed.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm))',
  ],
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'database/**/*.{ts,tsx}',
    '!**/index.ts',
  ],
};
