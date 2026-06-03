/**
 * Manual Jest mock for `database/client`. Re-exports the in-memory better-sqlite3 test client so
 * `jest.mock('<path>/client')` swaps the native expo-sqlite connection for a real, working SQLite
 * DB. The singleton lives in `testkit/sqliteClient` (NOT here) so the mock and any test that reads
 * the DB directly share one connection — see that file's header for why.
 */
export * from '../testkit/sqliteClient';
