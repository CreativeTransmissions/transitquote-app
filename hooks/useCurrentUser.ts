/** The signed-in user record from the local DB (reactive). Null until configuration is seeded. */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../database/client';
import { currentUser, type CurrentUserRow } from '../database/schema';

export function useCurrentUser(): CurrentUserRow | null {
  const { data } = useLiveQuery(db.select().from(currentUser).where(eq(currentUser.id, 1)));
  return data.at(0) ?? null;
}
