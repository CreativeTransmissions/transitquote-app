/**
 * Live-queries the three small reference tables needed to render job-card meta rows:
 * services, vehicles, and payment_status_types. Returns plain id→name maps so JobCard
 * can resolve names without hooks-per-card or direct DB access inside a component.
 *
 * Called ONCE in JobList; maps are passed as props to each JobCard — conforming to the
 * architecture principle that components receive data via hook abstractions, not raw DB queries.
 */
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { servicesQuery, vehiclesQuery, paymentStatusTypesQuery } from '../database/queries/lookups';

export interface JobCardLookups {
  serviceNames: Record<number, string>;
  vehicleNames: Record<number, string>;
  paymentStatusNames: Record<number, string>;
}

function toMap(rows: { id: number; name: string }[]): Record<number, string> {
  const result: Record<number, string> = {};
  for (const row of rows) {
    result[row.id] = row.name;
  }
  return result;
}

export function useJobCardLookups(): JobCardLookups {
  const { data: serviceRows } = useLiveQuery(servicesQuery());
  const { data: vehicleRows } = useLiveQuery(vehiclesQuery());
  const { data: paymentStatusRows } = useLiveQuery(paymentStatusTypesQuery());

  return {
    serviceNames: toMap(serviceRows),
    vehicleNames: toMap(vehicleRows),
    paymentStatusNames: toMap(paymentStatusRows),
  };
}
