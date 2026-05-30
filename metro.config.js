// Metro config — extends the Expo default to bundle Drizzle's generated `.sql` migrations
// as assets so the on-boot migrator can read them (see database/client.ts).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

module.exports = config;
