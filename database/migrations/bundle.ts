/**
 * Runtime migration bundle for the Expo SQLite migrator.
 *
 * drizzle-kit also emits `migrations.js`, but that imports the `.sql` file as a string, which
 * needs `babel-plugin-inline-import` + Metro asset wiring. To keep the migrator dependency-free
 * and unit-verifiable, we instead provide the exact object the Expo migrator consumes:
 * `{ journal, migrations: { m<NNNN>: "<raw SQL with --> statement-breakpoint markers>" } }`.
 * The Expo `readMigrationFiles` splits each entry on the breakpoint marker — pure string ops,
 * no Node `fs`, so this is React-Native safe.
 *
 * ⚠️ When the schema changes: run `npm run db:generate`, then mirror the new/updated `.sql`
 * contents into the matching `m<NNNN>` entry below (key = `m` + zero-padded journal idx).
 */
import journal from './meta/_journal.json';

// Verbatim copy of 0000_brave_switch.sql (keep the `--> statement-breakpoint` markers intact).
const m0000 = `CREATE TABLE \`current_user\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`wp_user_id\` integer,
	\`first_name\` text,
	\`last_name\` text,
	\`roles_json\` text,
	\`driver_id\` integer
);
--> statement-breakpoint
CREATE TABLE \`drivers\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`wp_user_id\` integer,
	\`first_name\` text,
	\`last_name\` text,
	\`email\` text,
	\`phone\` text,
	\`available\` integer,
	\`can_assign_to\` integer,
	\`roles_json\` text
);
--> statement-breakpoint
CREATE TABLE \`job_details\` (
	\`job_id\` integer PRIMARY KEY NOT NULL,
	\`customer_json\` text,
	\`journey_json\` text,
	\`stops_json\` text,
	\`quote_json\` text,
	\`job_date_json\` text,
	\`payment_json\` text,
	\`hydrated_at\` text,
	FOREIGN KEY (\`job_id\`) REFERENCES \`jobs\`(\`id\`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE \`jobs\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`job_ref\` text NOT NULL,
	\`service_id\` integer,
	\`vehicle_id\` integer,
	\`status_type_id\` integer,
	\`customer_id\` integer,
	\`driver_id\` integer,
	\`accepted_quote_id\` integer,
	\`payment_type_id\` integer,
	\`payment_status_id\` integer,
	\`description\` text,
	\`customer_reference\` text,
	\`delivery_contact_name\` text,
	\`delivery_time\` text,
	\`weight\` real,
	\`status_name\` text,
	\`driver_name\` text,
	\`payment_type_name\` text,
	\`payment_status_name\` text,
	\`customer_last_name\` text,
	\`created\` text,
	\`modified\` text
);
--> statement-breakpoint
CREATE TABLE \`outbox\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`action_type\` text NOT NULL,
	\`payload_json\` text NOT NULL,
	\`status\` text DEFAULT 'pending' NOT NULL,
	\`attempts\` integer DEFAULT 0 NOT NULL,
	\`last_error\` text,
	\`created_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`payment_status_types\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`services\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`status_types\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`sync_meta\` (
	\`table_name\` text PRIMARY KEY NOT NULL,
	\`last_synced_at\` text
);
--> statement-breakpoint
CREATE TABLE \`team_settings\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`assignment_mode\` text,
	\`currency_id\` text,
	\`currency_code\` text,
	\`currency_symbol\` text,
	\`tax_name\` text,
	\`tax_rate\` text,
	\`distance_unit\` text,
	\`weight_unit\` text,
	\`map_api_key\` text,
	\`start_lat\` text,
	\`start_lng\` text
);
--> statement-breakpoint
CREATE TABLE \`vehicles\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`name\` text NOT NULL
);
`;

// Verbatim copy of 0001_unique_trish_tilby.sql (adds the customers table — M3).
const m0001 = `CREATE TABLE \`customers\` (
	\`id\` integer PRIMARY KEY NOT NULL,
	\`wp_user_id\` integer,
	\`first_name\` text,
	\`last_name\` text,
	\`email\` text,
	\`phone\` text,
	\`created\` text,
	\`modified\` text
);
`;

// Verbatim copy of 0002_chunky_robin_chapel.sql (adds the job-card summary columns — list view).
const m0002 = `ALTER TABLE \`jobs\` ADD \`customer_first_name\` text;--> statement-breakpoint
ALTER TABLE \`jobs\` ADD \`pickup_address\` text;--> statement-breakpoint
ALTER TABLE \`jobs\` ADD \`pickup_datetime\` text;--> statement-breakpoint
ALTER TABLE \`jobs\` ADD \`pickup_is_asap\` integer;`;

// Verbatim copy of 0003_remarkable_wild_child.sql (adds WP date/time display formats).
const m0003 = `ALTER TABLE \`team_settings\` ADD \`date_format\` text;--> statement-breakpoint
ALTER TABLE \`team_settings\` ADD \`time_format\` text;`;

// Verbatim copy of 0004_fancy_adam_warlock.sql (adds ask_for_time → date-only pickups).
const m0004 = `ALTER TABLE \`team_settings\` ADD \`ask_for_time\` integer;`;

// Shape consumed by the Expo migrator (drizzle-orm/expo-sqlite/migrator).
const bundle: {
  journal: typeof journal;
  migrations: Record<string, string>;
} = {
  journal,
  migrations: { m0000, m0001, m0002, m0003, m0004 },
};

export default bundle;
