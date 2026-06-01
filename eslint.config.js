// Flat config (ESLint 9+). Uses Expo's shared config.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // Node CLI helpers (run via `node scripts/...`), not RN/Expo runtime code.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        process: 'readonly',
        console: 'readonly',
        __dirname: 'readonly',
        require: 'readonly',
        module: 'writable',
      },
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'database/migrations/*'],
  },
];
