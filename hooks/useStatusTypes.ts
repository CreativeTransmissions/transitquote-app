/** Reactive list of status types (id + name) from the local DB, for the status picker. */
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { db } from '../database/client';
import { statusTypes } from '../database/schema';

export interface StatusType {
  id: number;
  name: string;
}

export function useStatusTypes(): StatusType[] {
  const { data } = useLiveQuery(db.select().from(statusTypes));
  return data;
}
