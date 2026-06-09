// Global AsyncStorage mock. settingsStore (and useTheme via it) imports AsyncStorage at module
// load, so every test that renders a themed component transitively needs the native module
// stubbed. The official in-memory mock satisfies that; per-file jest.mock() calls still override.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
