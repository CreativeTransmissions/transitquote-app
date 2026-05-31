/** Customer queries against the local DB (offline-first). Reactive list/detail + job history. */
import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../client';
import { customers, jobs, type CustomerInsert } from '../schema';

/** Reactive: all customers, alphabetical by last name. */
export function customersListQuery() {
  return db.select().from(customers).orderBy(asc(customers.lastName));
}

/** Reactive: a single customer by id. */
export function customerByIdQuery(id: number) {
  return db.select().from(customers).where(eq(customers.id, id));
}

/** Reactive: a customer's job history, newest first. */
export function customerJobsQuery(customerId: number) {
  return db.select().from(jobs).where(eq(jobs.customerId, customerId)).orderBy(desc(jobs.modified));
}

/** Replace the customers table with a freshly pulled list. */
export function replaceCustomers(rows: CustomerInsert[]): void {
  db.transaction((tx) => {
    tx.delete(customers).run();
    for (const row of rows) tx.insert(customers).values(row).run();
  });
}
