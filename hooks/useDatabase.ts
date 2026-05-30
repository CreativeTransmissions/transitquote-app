/**
 * Applies pending DB migrations on app boot. Wraps Drizzle's Expo `useMigrations` so the root
 * layout can gate the UI on a loading/error state while the schema is created/updated.
 */
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../database/client';
import bundle from '../database/migrations/bundle';

export interface DatabaseStatus {
  ready: boolean;
  error: Error | undefined;
}

export function useDatabase(): DatabaseStatus {
  const { success, error } = useMigrations(db, bundle);
  return { ready: success, error };
}
