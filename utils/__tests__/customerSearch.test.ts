import { filterCustomers } from '../customerSearch';

type TestCustomer = { firstName: string; lastName: string; email: string; phone: string };

const customers: TestCustomer[] = [
  { firstName: 'Jane', lastName: 'Doe', email: 'jane@acme.com', phone: '07700900111' },
  { firstName: 'Sam', lastName: 'Patel', email: 'sam@globex.com', phone: '07700900222' },
];

describe('filterCustomers', () => {
  it('returns all customers for an empty query', () => {
    expect(filterCustomers(customers, '')).toHaveLength(2);
    expect(filterCustomers(customers, '   ')).toHaveLength(2);
  });

  it('matches on full name (case-insensitive)', () => {
    expect(filterCustomers(customers, 'jane doe').map((c) => c.lastName)).toEqual(['Doe']);
    expect(filterCustomers(customers, 'PATEL').map((c) => c.lastName)).toEqual(['Patel']);
  });

  it('matches on email and phone', () => {
    expect(filterCustomers(customers, 'globex').map((c) => c.firstName)).toEqual(['Sam']);
    expect(filterCustomers(customers, '900111').map((c) => c.firstName)).toEqual(['Jane']);
  });

  it('returns nothing when there is no match', () => {
    expect(filterCustomers(customers, 'zzz')).toEqual([]);
  });
});
