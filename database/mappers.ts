/**
 * API → local DB mappers.
 *
 * The single boundary where string-typed wire payloads (types/api.ts) become typed DB rows
 * (schema.ts). Nothing outside this file should read raw wire fields. See docs/API_NOTES.md
 * for why coercion is needed (WordPress string serialisation, zero-date sentinel, etc.).
 */
import type {
  Job,
  JobDetail,
  ConfigurationData,
  Driver,
  Customer,
} from '../types/api';
import { toInt, toFloat, toBool, toDateOrNull, toStr } from '../utils/coerce';
import type {
  JobInsert,
  JobDetailRow,
  DriverRow,
  CustomerInsert,
  TeamSettingsRow,
  CurrentUserRow,
} from './schema';

export function mapJob(job: Job): JobInsert {
  return {
    id: toInt(job.id)!,
    jobRef: job.job_ref,
    serviceId: toInt(job.service_id),
    vehicleId: toInt(job.vehicle_id),
    statusTypeId: toInt(job.status_type_id),
    customerId: toInt(job.customer_id),
    driverId: toInt(job.driver_id),
    acceptedQuoteId: toInt(job.accepted_quote_id),
    paymentTypeId: toInt(job.payment_type_id),
    paymentStatusId: toInt(job.payment_status_id),
    description: toStr(job.description),
    customerReference: toStr(job.customer_reference),
    deliveryContactName: toStr(job.delivery_contact_name),
    deliveryTime: toDateOrNull(job.delivery_time),
    weight: toFloat(job.weight),
    statusName: toStr(job.status_name),
    // Kept nullable (NOT toStr): the UI relies on `driverName ?? 'Unassigned'`, so coercing null
    // to '' here would render an unassigned job blank instead of "Unassigned".
    driverName: job.driver_name,
    paymentTypeName: job.payment_type_name,
    paymentStatusName: job.payment_status_name,
    customerLastName: toStr(job.last_name),
    customerFirstName: toStr(job.first_name),
    pickupAddress: toStr(job.pickup_address),
    pickupDatetime: toDateOrNull(job.pickup_datetime),
    pickupIsAsap: toBool(job.pickup_is_asap),
    created: toDateOrNull(job.created),
    modified: toDateOrNull(job.modified),
  };
}

/** Detail extends the base job (without the list-only denormalised fields) plus nested blobs. */
export function mapJobDetail(detail: JobDetail, hydratedAt: string): {
  job: JobInsert;
  detail: JobDetailRow;
} {
  const job: JobInsert = {
    id: toInt(detail.id)!,
    jobRef: detail.job_ref,
    serviceId: toInt(detail.service_id),
    vehicleId: toInt(detail.vehicle_id),
    statusTypeId: toInt(detail.status_type_id),
    customerId: toInt(detail.customer_id),
    acceptedQuoteId: toInt(detail.accepted_quote_id),
    paymentTypeId: toInt(detail.payment_type_id),
    paymentStatusId: toInt(detail.payment_status_id),
    description: toStr(detail.description),
    customerReference: toStr(detail.customer_reference),
    deliveryContactName: toStr(detail.delivery_contact_name),
    deliveryTime: toDateOrNull(detail.delivery_time),
    weight: toFloat(detail.weight),
    created: toDateOrNull(detail.created),
    modified: toDateOrNull(detail.modified),
  };
  const detailRow: JobDetailRow = {
    jobId: toInt(detail.id)!,
    customer: detail.customer,
    journey: detail.journey,
    stops: detail.stops,
    quote: detail.quote,
    jobDate: detail.job_date,
    payment: detail.payment,
    hydratedAt,
  };
  return { job, detail: detailRow };
}

export function mapCustomer(customer: Customer): CustomerInsert {
  return {
    id: toInt(customer.id)!,
    wpUserId: toInt(customer.wp_user_id),
    firstName: toStr(customer.first_name),
    lastName: toStr(customer.last_name),
    email: toStr(customer.email),
    phone: toStr(customer.phone),
    created: toDateOrNull(customer.created),
    modified: toDateOrNull(customer.modified),
  };
}

export function mapDriver(driver: Driver): DriverRow {
  return {
    id: toInt(driver.id)!,
    wpUserId: toInt(driver.wp_user_id),
    firstName: toStr(driver.first_name),
    lastName: toStr(driver.last_name),
    email: toStr(driver.email),
    phone: toStr(driver.phone),
    available: toBool(driver.available),
    canAssignTo: toInt(driver.can_assign_to),
    roles: driver.roles,
  };
}

export interface MappedConfiguration {
  teamSettings: TeamSettingsRow;
  currentUser: CurrentUserRow;
  drivers: DriverRow[];
  services: { id: number; name: string }[];
  vehicles: { id: number; name: string }[];
  statusTypes: { id: number; name: string }[];
  paymentStatusTypes: { id: number; name: string }[];
}

export function mapConfiguration(config: ConfigurationData): MappedConfiguration {
  const ts = config.team_settings;
  const fc = config.field_config;
  const drivers = config.drivers.map(mapDriver);

  // The user object has no driver_id — derive it by matching the user's wp_user_id against
  // the drivers list (see docs/API_NOTES.md §6).
  const userWpId = config.user.wp_user_id;
  const matchedDriver = drivers.find((d) => d.wpUserId === userWpId);

  return {
    teamSettings: {
      id: 1,
      assignmentMode: ts.job_assignment,
      currencyId: toStr(ts.currency),
      currencyCode: toStr(ts.custom_currency_code),
      currencySymbol: toStr(ts.custom_currency_symbol),
      taxName: toStr(ts.tax_name),
      taxRate: toStr(ts.tax_rate),
      distanceUnit: toStr(ts.distance_unit),
      weightUnit: toStr(ts.weight_unit_name),
      mapApiKey: toStr(ts.api_key),
      startLat: toStr(ts.start_lat),
      startLng: toStr(ts.start_lng),
      // WordPress display formats — fall back to WP defaults when the site omits field_config.
      dateFormat: fc?.date_format ?? 'F j, Y',
      timeFormat: fc?.time_format ?? 'g:i a',
      // Default to true when unknown: a real time-of-day still renders; midnight is shown date-only.
      askForTime: fc?.ask_for_time ?? true,
    },
    currentUser: {
      id: 1,
      wpUserId: userWpId,
      firstName: toStr(config.user.first_name),
      lastName: toStr(config.user.last_name),
      roles: config.user.roles,
      driverId: matchedDriver?.id ?? null,
    },
    drivers,
    services: config.services.map((s) => ({ id: toInt(s.id)!, name: s.name })),
    vehicles: config.vehicles.map((v) => ({ id: toInt(v.id)!, name: v.name })),
    // status_types is an object keyed by id, not an array (see docs/API_NOTES.md §6).
    statusTypes: Object.values(config.status_types).map((s) => ({ id: toInt(s.id)!, name: s.name })),
    paymentStatusTypes: config.payment_status_types.map((p) => ({ id: toInt(p.id)!, name: p.name })),
  };
}
