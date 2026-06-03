/**
 * Integration tests for the remaining query modules against a real (in-memory) SQLite DB:
 * drivers (reactive list), customers (list ordering / by-id / job history / wholesale replace),
 * configuration (seed reference data + current user, wholesale), and session (clearLocalData wipes
 * every table). Complements jobs/outbox/writeActions which are tested separately.
 */
jest.mock('../../client');

import { db, resetTestDb } from '../../testkit/sqliteClient';
import { driversListQuery } from '../drivers';
import { customersListQuery, customerByIdQuery, customerJobsQuery, replaceCustomers } from '../customers';
import { seedConfiguration, getCurrentUserRow } from '../configuration';
import { clearLocalData } from '../session';
import {
  drivers,
  customers,
  jobs,
  services,
  vehicles,
  statusTypes,
  outbox,
  type CustomerInsert,
} from '../../schema';
import type { MappedConfiguration } from '../../mappers';

beforeEach(() => resetTestDb());

function customer(id: number, lastName: string): CustomerInsert {
  return { id, firstName: `F${id}`, lastName, email: null, phone: null };
}

describe('drivers', () => {
  it('driversListQuery returns the seeded drivers', () => {
    db.insert(drivers).values([{ id: 1, firstName: 'Pat' }, { id: 2, firstName: 'Sam' }]).run();
    expect(driversListQuery().all().map((d) => d.id).sort()).toEqual([1, 2]);
  });
});

describe('customers', () => {
  it('replaceCustomers writes the list; customersListQuery returns it sorted by last name', () => {
    replaceCustomers([customer(1, 'Zebra'), customer(2, 'Apple')]);
    expect(customersListQuery().all().map((c) => c.lastName)).toEqual(['Apple', 'Zebra']);
  });

  it('replaceCustomers is wholesale (drops the previous set)', () => {
    replaceCustomers([customer(1, 'Apple'), customer(2, 'Banana')]);
    replaceCustomers([customer(3, 'Cherry')]);
    expect(customersListQuery().all().map((c) => c.id)).toEqual([3]);
  });

  it('customerByIdQuery selects a single customer', () => {
    replaceCustomers([customer(1, 'Apple'), customer(2, 'Banana')]);
    expect(customerByIdQuery(2).all().map((c) => c.lastName)).toEqual(['Banana']);
  });

  it('customerJobsQuery returns that customer’s jobs newest-first', () => {
    db.insert(jobs)
      .values([
        { id: 10, jobRef: 'J10', customerId: 5, modified: '2026-06-01 10:00:00' },
        { id: 11, jobRef: 'J11', customerId: 5, modified: '2026-06-03 10:00:00' },
        { id: 12, jobRef: 'J12', customerId: 9, modified: '2026-06-02 10:00:00' },
      ])
      .run();
    expect(customerJobsQuery(5).all().map((j) => j.id)).toEqual([11, 10]);
  });
});

describe('configuration', () => {
  function config(overrides: Partial<MappedConfiguration> = {}): MappedConfiguration {
    return {
      teamSettings: { id: 1, assignmentMode: 'Decentralized' } as MappedConfiguration['teamSettings'],
      currentUser: { id: 1, firstName: 'Ada', roles: ['dispatch'], driverId: null } as MappedConfiguration['currentUser'],
      drivers: [{ id: 1, firstName: 'Pat' } as MappedConfiguration['drivers'][number]],
      services: [{ id: 1, name: 'Same day' }],
      vehicles: [{ id: 1, name: 'Van' }],
      statusTypes: [{ id: 1, name: 'Booked' }],
      paymentStatusTypes: [{ id: 1, name: 'Paid' }],
      ...overrides,
    };
  }

  it('seeds reference data + current user', () => {
    seedConfiguration(config());
    expect(db.select().from(services).all()).toHaveLength(1);
    expect(db.select().from(vehicles).all()).toHaveLength(1);
    expect(db.select().from(statusTypes).all()).toHaveLength(1);
    expect(db.select().from(drivers).all()).toHaveLength(1);
    expect(getCurrentUserRow()).toMatchObject({ firstName: 'Ada', roles: ['dispatch'] });
  });

  it('getCurrentUserRow returns null before any seed', () => {
    expect(getCurrentUserRow()).toBeNull();
  });

  it('re-seeding replaces reference data wholesale', () => {
    seedConfiguration(config({ services: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }] }));
    seedConfiguration(config({ services: [{ id: 9, name: 'Only' }] }));
    expect(db.select().from(services).all().map((s) => s.id)).toEqual([9]);
  });

  it('tolerates empty reference arrays', () => {
    seedConfiguration(config({ services: [], drivers: [] }));
    expect(db.select().from(services).all()).toHaveLength(0);
    expect(getCurrentUserRow()).not.toBeNull();
  });
});

describe('session.clearLocalData', () => {
  it('wipes every local table in one transaction', () => {
    db.insert(jobs).values({ id: 1, jobRef: 'J1' }).run();
    db.insert(drivers).values({ id: 1, firstName: 'Pat' }).run();
    db.insert(services).values({ id: 1, name: 'S' }).run();
    db.insert(customers).values(customer(1, 'Apple')).run();
    db.insert(outbox).values({ actionType: 'UPDATE_STATUS', payload: { id: 1 }, createdAt: 'now' }).run();

    clearLocalData();

    expect(db.select().from(jobs).all()).toHaveLength(0);
    expect(db.select().from(drivers).all()).toHaveLength(0);
    expect(db.select().from(services).all()).toHaveLength(0);
    expect(db.select().from(customers).all()).toHaveLength(0);
    expect(db.select().from(outbox).all()).toHaveLength(0);
  });
});
