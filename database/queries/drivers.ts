/** Driver queries against the local DB (seeded from /configuration). Reactive list for pickers. */
import { db } from '../client';
import { drivers } from '../schema';

/** Reactive: all drivers (id + name + availability + can_assign_to). */
export function driversListQuery() {
  return db.select().from(drivers);
}
