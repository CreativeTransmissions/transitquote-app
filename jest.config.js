/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // RNTL v13+ registers its matchers automatically — no extend-expect setup needed.
  moduleNameMapper: {
    // Point @expo/vector-icons at the manual mock so tests that transitively import Icon.tsx
    // don't need per-file jest.mock() calls for the native font loader.
    '^@expo/vector-icons$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
    '^@expo/vector-icons/(.*)$': '<rootDir>/__mocks__/@expo/vector-icons.tsx',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|drizzle-orm))',
  ],
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'database/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/index.ts',
  ],
  // Test infrastructure and generated/native-only modules are not product code — exclude them so
  // the report reflects real coverage (the testkit harness and manual mocks would otherwise count).
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/database/testkit/',
    '/__mocks__/',
    '/database/migrations/',
    '/database/client.ts', // native expo-sqlite connection; the testkit stands in for it under jest
  ],
  // Ratchet floor — keeps the well-covered core (utils, services, sync, query layer) from
  // regressing. Raise these as the thinner areas (components, the remaining hooks, app routes)
  // gain coverage; do not lower them.
  coverageThreshold: {
    global: { statements: 90, branches: 85, functions: 90, lines: 93 },
  },
};
