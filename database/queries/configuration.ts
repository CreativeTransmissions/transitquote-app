/**
 * Seed reference data + current user from a freshly fetched /configuration.
 * Synchronous — expo-sqlite/Drizzle transactions run via `withTransactionSync` (writes use `.run()`).
 * Replaces each reference table wholesale (the config is small and authoritative).
 */
import { eq } from 'drizzle-orm';
import { db } from '../client';
import {
  services,
  vehicles,
  statusTypes,
  paymentStatusTypes,
  drivers,
  teamSettings,
  currentUser,
  type CurrentUserRow,
} from '../schema';
import type { MappedConfiguration } from '../mappers';

/** Non-reactive read of the single current-user row (id = 1), or null before config is seeded. */
export function getCurrentUserRow(): CurrentUserRow | null {
  return db.select().from(currentUser).where(eq(currentUser.id, 1)).all().at(0) ?? null;
}

export function seedConfiguration(config: MappedConfiguration): void {
  db.transaction((tx) => {
    tx.delete(services).run();
    if (config.services.length) tx.insert(services).values(config.services).run();

    tx.delete(vehicles).run();
    if (config.vehicles.length) tx.insert(vehicles).values(config.vehicles).run();

    tx.delete(statusTypes).run();
    if (config.statusTypes.length) tx.insert(statusTypes).values(config.statusTypes).run();

    tx.delete(paymentStatusTypes).run();
    if (config.paymentStatusTypes.length) tx.insert(paymentStatusTypes).values(config.paymentStatusTypes).run();

    tx.delete(drivers).run();
    if (config.drivers.length) tx.insert(drivers).values(config.drivers).run();

    // Single-row tables (id = 1).
    tx.delete(teamSettings).run();
    tx.insert(teamSettings).values(config.teamSettings).run();

    tx.delete(currentUser).run();
    tx.insert(currentUser).values(config.currentUser).run();
  });
}
