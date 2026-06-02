/**
 * Raw API wire shapes for the TransitQuote REST API (`/wp-json/transitquote/v1`).
 *
 * These describe the bytes on the wire as the WordPress backend actually sends them —
 * verified against the live test site (see docs/API_NOTES.md). They are deliberately
 * NOT the app's domain model: the mapping/sync layer coerces these into the typed,
 * number/boolean/Date-shaped values used by the rest of the app.
 *
 * Two wire facts drive the shapes below:
 *  1. WordPress serialises almost everything as strings — ids ("1"), money ("42.00"),
 *     booleans ("0"/"1"), counts. Fields may also be null. Never assume a number/boolean.
 *  2. Dates are MySQL datetimes ("YYYY-MM-DD HH:MM:SS") and may be the zero sentinel
 *     "0000-00-00 00:00:00" — guard for it before parsing with dayjs.
 */

/** WordPress boolean flag on the wire: "1" = true, "0" = false (sometimes "" / null). */
export type WireBool = '0' | '1' | '' | null;

/** MySQL datetime string, e.g. "2026-05-12 19:29:05", or the zero sentinel. */
export type WireDate = string;

// ─── Response envelope ──────────────────────────────────────────────────────
// Success responses are { data, success } — there is NO `message` field.
// Error responses use the WordPress REST error shape (which DOES carry `message`).

export interface ApiResponse<T> {
  data: T;
  success: boolean;
}

export interface ApiErrorResponse {
  code: string | number;
  message: string;
  data: { status: number; [key: string]: unknown };
}

/**
 * Write endpoint envelopes (verified live, see docs/API_NOTES.md §10). They are inconsistent:
 *  - update_job_status → `{ data: <updated job>, success: boolean }` (same top-level `success` as reads).
 *  - update_assigned   → `{ msg: string, success: boolean }` (uses `msg`, not `message`).
 * Both expose a top-level `success`; this loose shape covers both.
 */
export interface WriteResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  msg?: string;
  code?: string;
}

// ─── Authentication (two-step OAuth2 authorization-code grant) ───────────────
// 1. POST /transitquote/v1/rest_login → returns an authorization `code` (NOT a token).
// 2. POST /oauth2/access_token (form-encoded) → exchanges the code for an access_token.

export interface RestLoginResponse {
  /** Authorization code to exchange at the token endpoint. Not usable as a Bearer token. */
  code: string;
  success: boolean;
  /** Authenticated WP user payload (roles/caps). Shape varies; only `roles` is relied on. */
  data: {
    ID: number;
    roles: string[];
    caps: Record<string, boolean>;
    allcaps: Record<string, boolean>;
    [key: string]: unknown;
  };
}

export interface TokenResponse {
  access_token: string;
  token_type: string; // "bearer"
}

// ─── Configuration (GET /configuration) ─────────────────────────────────────

export interface ConfigurationData {
  team_settings: TeamSettings;
  services: Service[];
  vehicles: Vehicle[];
  /** Keyed by status id string, NOT an array. e.g. { "1": {...}, "2": {...} }. */
  status_types: Record<string, StatusType>;
  payment_status_types: PaymentStatusType[];
  drivers: Driver[];
  user: CurrentUser;
  /** Optional display/field-visibility config (added server-side; older sites may omit it). */
  field_config?: FieldConfig;
}

/**
 * Field-visibility / display config (plugin `field_config`). Only the fields the app consumes are
 * typed. `date_format`/`time_format` are WordPress display formats in PHP `date()` syntax so the
 * client can render dates/times to match the site (see docs/API_NOTES.md).
 */
export interface FieldConfig {
  date_format?: string;
  time_format?: string;
  per_address_dates?: boolean;
  /** Whether the booking form collects a time-of-day. When false, pickups are shown date-only. */
  ask_for_time?: boolean;
}

/**
 * `team_settings` carries ~120 fields (form theming, labels, rate flags, etc.).
 * Only the fields the app consumes are typed here; the rest are intentionally
 * omitted. Add fields as features need them rather than typing all of them.
 */
export interface TeamSettings {
  /** Role of the authenticated user, e.g. "Driver". Display only — never for access control. */
  tt_role: string;
  /** Assignment mode. Replaces the spec's `tt_job_assignment_mode`. */
  job_assignment: 'Centralized' | 'Decentralized';
  /** Currency identifier (numeric id as string, e.g. "18"), not a symbol. */
  currency: string;
  custom_currency_code: string;
  custom_currency_symbol: string;
  tax_rate: string;
  tax_name: string;
  distance_unit: string; // e.g. "Mile"
  weight_unit_name: string; // e.g. "kg"
  /** Google Maps API key, supplied by the site config. */
  api_key: string;
  api_key_v3: string;
  map_api_version: string; // e.g. "google_maps_v3"
  /** Base/depot location. */
  start_location: string;
  start_lat: string;
  start_lng: string;
  country_code: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  service_duration_per_stop: string | null;
  full_day: string | null;
  service_duration: string | null;
  amount: string;
  sort_order: string;
  max_distance: string | null;
  created: WireDate;
  modified: WireDate;
}

export interface Vehicle {
  id: string;
  name: string;
  description: string;
  fleet_size: string | null;
  buffer_time_before: string;
  buffer_time_after: string;
  amount: string;
  sort_order: string;
  created: WireDate;
  modified: WireDate;
}

export interface StatusType {
  id: string;
  name: string;
  enable_customer_notification: WireBool;
  enable_admin_notification: WireBool;
  created: WireDate;
  modified: WireDate;
}

export interface PaymentStatusType {
  id: string;
  name: string;
  description: string;
  created: WireDate;
  modified: WireDate;
}

export interface Driver {
  id: string;
  wp_user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  available: WireBool;
  /**
   * The driver id(s) this driver may assign to — a driver id STRING (e.g. "432"),
   * NOT a boolean. Cross-reference against the drivers list at assignment time.
   */
  can_assign_to: string;
  created: WireDate;
  modified: WireDate;
  roles: string[];
}

/** The authenticated user as returned inside `configuration.user`. */
export interface CurrentUser {
  /** Note: number on the wire here, unlike the string ids elsewhere. */
  wp_user_id: number;
  user_nicename: string;
  first_name: string;
  last_name: string;
  /** Role strings, e.g. ["Driver"]. Display only — never use for access control. */
  roles: string[];
  avatar_url: string;
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

/**
 * Job as returned by the LIST endpoint (GET /jobs). Flat and denormalised:
 * carries *_name display fields and a heavy `settings_snapshot` blob, but NO
 * nested customer/journey/stops/quote. Use JobDetail (GET /jobs?id=) for those.
 */
export interface Job {
  id: string;
  job_ref: string;
  delivery_contact_name: string;
  delivery_time: WireDate;
  description: string;
  dimensions: string;
  customer_id: string;
  accepted_quote_id: string | null;
  payment_type_id: string | null;
  payment_status_id: string | null;
  status_type_id: string;
  vehicle_id: string | null;
  service_id: string;
  move_size_id: string;
  customer_reference: string;
  weight: string;
  /** JSON string snapshot of the form options at booking time. */
  settings_snapshot: string;
  created: WireDate;
  modified: WireDate;
  driver_id: string | null;
  // Denormalised display fields (list only):
  last_name: string;
  status_name: string;
  payment_type_name: string | null;
  payment_status_name: string | null;
  driver_name: string | null;
  // Job-card summary fields resolved server-side (list only — see docs/API_NOTES.md §7).
  /** Customer first name (the list otherwise only carries last_name). */
  first_name: string;
  /** Address of the pickup stop (journey_order 0); '' when the job has no stops. */
  pickup_address: string;
  /**
   * Resolved pickup datetime (earliest valid per-stop time on per-address-date themes,
   * else the job's delivery_time). Null when ASAP or unset. Zero-sentinel normalised away.
   */
  pickup_datetime: WireDate | null;
  /** "1" when the pickup is an ASAP booking (per-address-date themes); pickup_datetime is null then. */
  pickup_is_asap: WireBool;
}

/** Job as returned by the DETAIL endpoint (GET /jobs?id=N): base fields + nested data. */
export interface JobDetail {
  id: string;
  job_ref: string;
  delivery_contact_name: string;
  delivery_time: WireDate;
  description: string;
  dimensions: string;
  customer_id: string;
  accepted_quote_id: string | null;
  payment_type_id: string | null;
  payment_status_id: string | null;
  status_type_id: string;
  vehicle_id: string | null;
  service_id: string;
  move_size_id: string;
  customer_reference: string;
  weight: string;
  settings_snapshot: string;
  created: WireDate;
  modified: WireDate;
  customer: Customer;
  journey: Journey;
  stops: Stop[];
  quote: Quote;
  /** Display label/value pairs for the pickup date/time. */
  job_date: LabelValue[];
  /** Display label/value pairs for payment method/status. */
  payment: LabelValue[];
}

export interface LabelValue {
  label: string;
  value: string;
}

export interface Customer {
  id: string;
  wp_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created: WireDate;
  modified: WireDate;
}

export interface Journey {
  id: string;
  job_id: string;
  distance: string;
  time: string;
  deliver_and_return: string | null;
  optimize_route: string | null;
  created: WireDate;
  modified: WireDate;
  map_link: string;
}

export interface Stop {
  id: string;
  address: string;
  appartment_no: string;
  street_number: string;
  postal_town: string;
  route: string;
  administrative_area_level_2: string;
  administrative_area_level_1: string;
  country: string;
  postal_code: string;
  lat: string;
  lng: string;
  place_id: string;
  created: WireDate;
  modified: WireDate;
  collection_date: WireDate;
  time_type: string;
  datetime_type: string | null;
  visit_type: string;
  /**
   * Per-stop contact (added server-side; re-verified live 2026-06-02 — see docs/API_NOTES.md §11).
   * From the `wp_..._journeys_locations` join, so they may be `""` when not entered for a stop.
   */
  contact_name: string;
  contact_phone: string;
  /** Free-text delivery note for the stop; `""` when none. */
  note: string;
  /** Stop ordering within the journey (`"0"`-based); the API returns stops already ordered by it. */
  journey_order: string;
}

export interface Quote {
  id: string;
  total: string;
  rate_unit: string;
  rate_hour: string;
  rate_tax: string;
  basic_cost: string;
  distance_cost: string;
  time_cost: string;
  notice_cost: string;
  tax_cost: string;
  breakdown: string;
  rates: string;
  created: WireDate;
  modified: WireDate;
}
