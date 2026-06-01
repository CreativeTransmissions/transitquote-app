import { mapJob, mapDriver, mapConfiguration } from '../mappers';
import type {
  Job,
  Driver,
  ConfigurationData,
  TeamSettings,
  CurrentUser,
} from '../../types/api';

const driver432: Driver = {
  id: '432',
  wp_user_id: '282',
  first_name: 'E2E',
  last_name: 'Created',
  phone: '07700900099',
  email: 'e2e@transitteam.test',
  available: '0',
  can_assign_to: '432',
  created: '0000-00-00 00:00:00',
  modified: '2026-05-11 19:59:05',
  roles: ['driver'],
};

const teamSettings = {
  tt_role: 'Driver',
  job_assignment: 'Centralized',
  currency: '18',
  custom_currency_code: 'GBP',
  custom_currency_symbol: '£',
  tax_rate: '20',
  tax_name: 'VAT',
  distance_unit: 'Mile',
  weight_unit_name: 'kg',
  api_key: 'MAPS_KEY',
  api_key_v3: 'MAPS_KEY',
  map_api_version: 'google_maps_v3',
  start_location: 'Hartley Wintney',
  start_lat: '51.30',
  start_lng: '-0.90',
  country_code: 'GB',
} as TeamSettings;

const user: CurrentUser = {
  wp_user_id: 282,
  user_nicename: 'api-driver',
  first_name: 'API',
  last_name: 'Driver',
  roles: ['Driver'],
  avatar_url: 'https://example/avatar',
};

describe('mapDriver', () => {
  it('coerces ids/booleans and treats can_assign_to as a driver-id (not boolean)', () => {
    const row = mapDriver(driver432);
    expect(row.id).toBe(432);
    expect(row.wpUserId).toBe(282);
    expect(row.available).toBe(false);
    expect(row.canAssignTo).toBe(432);
    expect(row.roles).toEqual(['driver']);
  });
});

describe('mapJob', () => {
  const job: Job = {
    id: '1',
    job_ref: 'MTS7395513583',
    delivery_contact_name: '',
    delivery_time: '2026-05-12 00:00:00',
    description: 'Test booking',
    dimensions: '',
    customer_id: '1',
    accepted_quote_id: '29',
    payment_type_id: '3',
    payment_status_id: '4',
    status_type_id: '2',
    vehicle_id: null,
    service_id: '4',
    move_size_id: '0',
    customer_reference: '',
    weight: '0.00',
    settings_snapshot: '{}',
    created: '0000-00-00 00:00:00',
    modified: '2026-05-12 19:29:05',
    driver_id: null,
    last_name: 'Customer',
    status_name: 'Assigned',
    payment_type_name: 'WooCommerce',
    payment_status_name: 'Approved',
    driver_name: null,
    first_name: 'Test',
    pickup_address: '1 High Street, London',
    pickup_datetime: '2026-05-12 09:30:00',
    pickup_is_asap: '0',
  };

  it('coerces strings to typed columns', () => {
    const row = mapJob(job);
    expect(row.id).toBe(1);
    expect(row.statusTypeId).toBe(2);
    expect(row.vehicleId).toBeNull();
    expect(row.driverId).toBeNull();
    expect(row.weight).toBe(0);
  });

  it('normalises the zero-date sentinel to null but keeps real dates', () => {
    const row = mapJob(job);
    expect(row.created).toBeNull();
    expect(row.modified).toBe('2026-05-12 19:29:05');
  });

  it('keeps denormalised display fields from the list', () => {
    const row = mapJob(job);
    expect(row.statusName).toBe('Assigned');
    expect(row.customerLastName).toBe('Customer');
  });

  it('maps the job-card summary fields (first name, pickup address/time, ASAP)', () => {
    const row = mapJob(job);
    expect(row.customerFirstName).toBe('Test');
    expect(row.pickupAddress).toBe('1 High Street, London');
    expect(row.pickupDatetime).toBe('2026-05-12 09:30:00');
    expect(row.pickupIsAsap).toBe(false);
  });

  it('treats an ASAP pickup as a boolean flag with no datetime', () => {
    const row = mapJob({ ...job, pickup_is_asap: '1', pickup_datetime: null });
    expect(row.pickupIsAsap).toBe(true);
    expect(row.pickupDatetime).toBeNull();
  });
});

describe('mapConfiguration', () => {
  const config: ConfigurationData = {
    team_settings: teamSettings,
    services: [
      { id: '4', name: 'Same Day', description: '', service_duration_per_stop: null, full_day: null, service_duration: null, amount: '0.00', sort_order: '1', max_distance: null, created: '', modified: '' },
    ],
    vehicles: [
      { id: '2', name: 'Small Van', description: '', fleet_size: null, buffer_time_before: '0', buffer_time_after: '0', amount: '0.00', sort_order: '1', created: '', modified: '' },
    ],
    status_types: {
      '1': { id: '1', name: 'New', enable_customer_notification: '1', enable_admin_notification: '1', created: '', modified: '' },
      '2': { id: '2', name: 'Assigned', enable_customer_notification: '1', enable_admin_notification: '1', created: '', modified: '' },
    },
    payment_status_types: [
      { id: '1', name: 'Due', description: 'Due', created: '', modified: '' },
    ],
    drivers: [driver432],
    user,
    field_config: { date_format: 'F j, Y', time_format: 'g:i a', per_address_dates: true, ask_for_time: true },
  };

  it('maps the assignment mode from job_assignment and currency from the id field', () => {
    const m = mapConfiguration(config);
    expect(m.teamSettings.assignmentMode).toBe('Centralized');
    expect(m.teamSettings.currencyId).toBe('18');
    expect(m.teamSettings.currencySymbol).toBe('£');
    expect(m.teamSettings.mapApiKey).toBe('MAPS_KEY');
  });

  it('captures the WordPress date/time formats and ask_for_time from field_config', () => {
    const m = mapConfiguration(config);
    expect(m.teamSettings.dateFormat).toBe('F j, Y');
    expect(m.teamSettings.timeFormat).toBe('g:i a');
    expect(m.teamSettings.askForTime).toBe(true);
  });

  it('captures ask_for_time = false when the form does not collect a time', () => {
    const m = mapConfiguration({ ...config, field_config: { ...config.field_config, ask_for_time: false } });
    expect(m.teamSettings.askForTime).toBe(false);
  });

  it('falls back to WP default formats and ask_for_time=true when field_config is absent', () => {
    const m = mapConfiguration({ ...config, field_config: undefined });
    expect(m.teamSettings.dateFormat).toBe('F j, Y');
    expect(m.teamSettings.timeFormat).toBe('g:i a');
    expect(m.teamSettings.askForTime).toBe(true);
  });

  it('flattens the id-keyed status_types object into an array', () => {
    const m = mapConfiguration(config);
    expect(m.statusTypes).toEqual([
      { id: 1, name: 'New' },
      { id: 2, name: 'Assigned' },
    ]);
  });

  it('derives current_user.driver_id by matching wp_user_id against the drivers list', () => {
    const m = mapConfiguration(config);
    // user.wp_user_id 282 matches driver 432's wp_user_id 282.
    expect(m.currentUser.driverId).toBe(432);
  });

  it('returns null driver_id when the user is not a driver', () => {
    const m = mapConfiguration({ ...config, user: { ...user, wp_user_id: 999 } });
    expect(m.currentUser.driverId).toBeNull();
  });
});
