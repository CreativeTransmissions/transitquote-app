/** Pure client-side customer search over name/email/phone (spec §6.8). Case-insensitive substring. */
import type { CustomerRow } from '../database/schema';
import { fullName } from './formatters';

type SearchableCustomer = Pick<CustomerRow, 'firstName' | 'lastName' | 'email' | 'phone'>;

export function filterCustomers<T extends SearchableCustomer>(customers: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return customers;
  return customers.filter((c) => {
    const haystack = [fullName(c.firstName, c.lastName), c.email, c.phone]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
