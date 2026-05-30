/** Reactive team settings (currency, units, map key, assignment mode) from the local DB. */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../database/client';
import { teamSettings, type TeamSettingsRow } from '../database/schema';

export function useTeamSettings(): TeamSettingsRow | null {
  const { data } = useLiveQuery(db.select().from(teamSettings).where(eq(teamSettings.id, 1)));
  return data.at(0) ?? null;
}
