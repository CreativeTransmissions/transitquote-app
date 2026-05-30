/** Per-table last-sync timestamps (sync_meta). Synchronous (expo-sqlite). */
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { syncMeta } from '../schema';

export function setLastSynced(tableName: string, iso: string): void {
  db.insert(syncMeta)
    .values({ tableName, lastSyncedAt: iso })
    .onConflictDoUpdate({ target: syncMeta.tableName, set: { lastSyncedAt: iso } })
    .run();
}

export function getLastSynced(tableName: string): string | null {
  const row = db.select().from(syncMeta).where(eq(syncMeta.tableName, tableName)).get();
  return row?.lastSyncedAt ?? null;
}
