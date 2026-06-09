/**
 * Reactive lookup queries for small reference tables used by the job card UI.
 * Returns Drizzle query builders suitable for `useLiveQuery`.
 */
import { db } from '../client';
import { services, vehicles, paymentStatusTypes } from '../schema';

/** Reactive: all services (id + name) for the job meta row. */
export function servicesQuery() {
  return db.select({ id: services.id, name: services.name }).from(services);
}

/** Reactive: all vehicles (id + name) for the job meta row. */
export function vehiclesQuery() {
  return db.select({ id: vehicles.id, name: vehicles.name }).from(vehicles);
}

/** Reactive: all payment status types (id + name) for the payment badge. */
export function paymentStatusTypesQuery() {
  return db.select({ id: paymentStatusTypes.id, name: paymentStatusTypes.name }).from(paymentStatusTypes);
}
