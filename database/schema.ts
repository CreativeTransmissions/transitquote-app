/**
 * Drizzle schema — the typed source of truth for the local SQLite database.
 *
 * Mirrors the spec's §11.2 table list (and CLAUDE.md "Local Database Schema"), adapted to
 * the verified API payloads (see docs/API_NOTES.md). The wire is string-typed; the mapping
 * layer (database/mappers.ts) coerces wire strings into the typed columns below.
 *
 * Reference tables store the small lookups from /configuration; `jobs` is the offline-first
 * job list; `job_details` holds the per-job hydrated detail blobs; `outbox`/`sync_meta` drive
 * the sync engine.
 */
import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core';
import type {
  Customer,
  Journey,
  Stop,
  Quote,
  LabelValue,
} from '../types/api';

// ─── Jobs (list) ─────────────────────────────────────────────────────────────
// Flat job row from GET /jobs, plus denormalised display fields the list UI needs offline.
export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey(),
  jobRef: text('job_ref').notNull(),
  serviceId: integer('service_id'),
  vehicleId: integer('vehicle_id'),
  statusTypeId: integer('status_type_id'),
  customerId: integer('customer_id'),
  driverId: integer('driver_id'),
  acceptedQuoteId: integer('accepted_quote_id'),
  paymentTypeId: integer('payment_type_id'),
  paymentStatusId: integer('payment_status_id'),
  description: text('description'),
  customerReference: text('customer_reference'),
  deliveryContactName: text('delivery_contact_name'),
  deliveryTime: text('delivery_time'), // ISO datetime or null (zero-sentinel normalised away)
  weight: real('weight'),
  // Denormalised display fields from the list endpoint (id->name resolved server-side):
  statusName: text('status_name'),
  driverName: text('driver_name'),
  paymentTypeName: text('payment_type_name'),
  paymentStatusName: text('payment_status_name'),
  customerLastName: text('customer_last_name'),
  created: text('created'),
  modified: text('modified'),
});

// ─── Job details (hydrated per job via GET /jobs?id=) ─────────────────────────
// Nested blobs are stored as JSON; the list never carries these.
export const jobDetails = sqliteTable('job_details', {
  jobId: integer('job_id')
    .primaryKey()
    .references(() => jobs.id),
  customer: text('customer_json', { mode: 'json' }).$type<Customer>(),
  journey: text('journey_json', { mode: 'json' }).$type<Journey>(),
  stops: text('stops_json', { mode: 'json' }).$type<Stop[]>(),
  quote: text('quote_json', { mode: 'json' }).$type<Quote>(),
  jobDate: text('job_date_json', { mode: 'json' }).$type<LabelValue[]>(),
  payment: text('payment_json', { mode: 'json' }).$type<LabelValue[]>(),
  hydratedAt: text('hydrated_at'),
});

// ─── Reference data (from /configuration) ─────────────────────────────────────
export const drivers = sqliteTable('drivers', {
  id: integer('id').primaryKey(),
  wpUserId: integer('wp_user_id'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  available: integer('available', { mode: 'boolean' }),
  // Driver id this driver may assign to (wire is a string id, e.g. "432"). Null when none.
  canAssignTo: integer('can_assign_to'),
  roles: text('roles_json', { mode: 'json' }).$type<string[]>(),
});

export const services = sqliteTable('services', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const vehicles = sqliteTable('vehicles', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const statusTypes = sqliteTable('status_types', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const paymentStatusTypes = sqliteTable('payment_status_types', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

// Single-row tables (id always 1).
export const teamSettings = sqliteTable('team_settings', {
  id: integer('id').primaryKey(),
  assignmentMode: text('assignment_mode').$type<'Centralized' | 'Decentralized'>(),
  currencyId: text('currency_id'),
  currencyCode: text('currency_code'),
  currencySymbol: text('currency_symbol'),
  taxName: text('tax_name'),
  taxRate: text('tax_rate'),
  distanceUnit: text('distance_unit'),
  weightUnit: text('weight_unit'),
  mapApiKey: text('map_api_key'),
  startLat: text('start_lat'),
  startLng: text('start_lng'),
});

export const currentUser = sqliteTable('current_user', {
  id: integer('id').primaryKey(),
  wpUserId: integer('wp_user_id'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  roles: text('roles_json', { mode: 'json' }).$type<string[]>(),
  driverId: integer('driver_id'),
});

// Customers (from GET /customers — same wire shape as the nested job-detail customer).
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey(),
  wpUserId: integer('wp_user_id'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  created: text('created'),
  modified: text('modified'),
});

// ─── Sync infrastructure ──────────────────────────────────────────────────────
export const outbox = sqliteTable('outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actionType: text('action_type').$type<OutboxActionType>().notNull(),
  payload: text('payload_json', { mode: 'json' }).$type<OutboxActionPayload>().notNull(),
  status: text('status').$type<OutboxStatus>().notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').notNull(),
});

export const syncMeta = sqliteTable('sync_meta', {
  tableName: text('table_name').primaryKey(),
  lastSyncedAt: text('last_synced_at'),
});

export type OutboxStatus = 'pending' | 'in_progress' | 'failed' | 'synced';

export type OutboxActionType = 'UPDATE_STATUS' | 'ASSIGN_DRIVER';

/** Outbox payload. `id` is always the job id; the other fields depend on the action type. */
export interface OutboxActionPayload {
  id: number;
  status_type_id?: number;
  driver_id?: number;
}

// Inferred row types — the app's local domain model.
export type JobRow = typeof jobs.$inferSelect;
export type JobInsert = typeof jobs.$inferInsert;
export type JobDetailRow = typeof jobDetails.$inferSelect;
export type DriverRow = typeof drivers.$inferSelect;
export type CustomerRow = typeof customers.$inferSelect;
export type CustomerInsert = typeof customers.$inferInsert;
export type TeamSettingsRow = typeof teamSettings.$inferSelect;
export type CurrentUserRow = typeof currentUser.$inferSelect;
export type OutboxRow = typeof outbox.$inferSelect;
export type OutboxInsert = typeof outbox.$inferInsert;
