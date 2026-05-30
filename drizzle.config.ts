import type { Config } from 'drizzle-kit';

// Generates SQL migrations from database/schema.ts into database/migrations/.
// Run with `npm run db:generate`. Migrations are applied on app boot (see database/client.ts).
export default {
  schema: './database/schema.ts',
  out: './database/migrations',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
