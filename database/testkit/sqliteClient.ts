/**
 * In-memory SQLite test client (better-sqlite3), standing in for the native expo-sqlite `db`.
 *
 * The production client (`database/client.ts`) opens a *native* connection at import time, so any
 * test importing a query/sync module transitively loads native code Jest can't resolve. Tests wire
 * this in with `jest.mock('<path>/client')` (the manual mock at `database/__mocks__/client.ts`
 * re-exports everything here), and read the same singleton DB via this module directly — both the
 * mock and the test must funnel through THIS module so they share one connection.
 *
 * Drizzle's better-sqlite3 and expo-sqlite drivers expose the same synchronous query-builder API
 * (`.all()`, `.run()`, `.get()`, `db.transaction(fn)`), so query functions run here unmodified.
 *
 * The schema is applied from the SAME migration bundle the app ships (`migrations/bundle.ts`), so
 * the test DB and the device DB can never drift — regenerate the bundle and both update together.
 *
 * Tests must reset between cases: call `resetTestDb()` in `beforeEach`.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../schema';
import bundle from '../migrations/bundle';

export const DATABASE_NAME = 'tqapp-test.db';

const sqlite = new Database(':memory:');
sqlite.pragma('foreign_keys = ON');

// Replay the shipped migrations in journal order. better-sqlite3's exec() runs all semicolon-
// separated statements in one call, so we only need to drop the breakpoint markers.
function applyMigrations(): void {
  for (const entry of bundle.journal.entries) {
    const key = `m${String(entry.idx).padStart(4, '0')}`;
    const sql = bundle.migrations[key];
    if (!sql) throw new Error(`Test DB: missing migration ${key} referenced by the journal`);
    sqlite.exec(sql.replaceAll('--> statement-breakpoint', '\n'));
  }
}

applyMigrations();

export const db = drizzle(sqlite, { schema });

export type DB = typeof db;
export type DbWriter = Pick<DB, 'update' | 'insert'>;

/** Names of every table the migrations create — used to wipe state between tests. */
const TABLES = [
  'jobs',
  'job_details',
  'customers',
  'drivers',
  'services',
  'vehicles',
  'status_types',
  'payment_status_types',
  'team_settings',
  'current_user',
  'outbox',
  'sync_meta',
] as const;

/** Clear all rows and reset AUTOINCREMENT counters so ids are deterministic across tests. */
export function resetTestDb(): void {
  sqlite.pragma('foreign_keys = OFF');
  for (const table of TABLES) sqlite.prepare(`DELETE FROM "${table}"`).run();
  // sqlite_sequence only exists once an AUTOINCREMENT table has been written to.
  const hasSeq = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'`)
    .get();
  if (hasSeq) sqlite.prepare(`DELETE FROM sqlite_sequence`).run();
  sqlite.pragma('foreign_keys = ON');
}
