# TransitTeam Mobile App — Requirements Document

**Product:** TransitTeam Mobile  
**Purpose:** Native mobile companion for courier companies using TransitQuote Pro + TransitTeam  
**API Backend:** TransitQuote API plugin (WordPress REST API)  
**Audience:** App developer handover

---

## 1. Overview

TransitTeam is a WordPress add-on plugin for courier dispatch companies. It sits on top of TransitQuote Pro (a quote calculator and job management system) and adds driver assignment and job management. Currently, drivers and dispatchers access their portal through a WordPress web page — the mobile app replaces and extends this with a native experience.

The mobile app will be the primary tool for:
- **Drivers** to receive and manage their jobs in the field
- **Dispatchers** to assign jobs, monitor status, and track their fleet

All data is fetched from the **TransitQuote API** — a REST API installed alongside the WordPress plugins on each customer's own server. The app must be configured per customer (their site URL becomes the API base).

---

## 2. Glossary

| Term | Meaning |
|------|---------|
| **Job** | A courier booking — one or more pickup/delivery stops for a customer |
| **Job Ref** | Human-readable job reference number shown to customers |
| **Stop / Waypoint** | An individual pickup or delivery address within a job |
| **Quote** | The calculated price for a job (distance + time + surcharges + tax) |
| **Driver** | A team member in the field who collects and delivers jobs |
| **Dispatch** | Back-office role responsible for assigning jobs to drivers |
| **Service** | Type of service (e.g., Same Day, Next Day, Express) |
| **Vehicle** | Type of vehicle (e.g., Van, Motorbike, Truck) |
| **Status Type** | Job lifecycle stage (e.g., Pending, Assigned, In Transit, Delivered) — defined per customer |
| **Centralized Mode** | Dispatch assigns jobs; drivers only see their own assigned jobs |
| **Decentralized Mode** | Drivers self-assign from a pool of unassigned jobs |
| **Job Assignment Mode** | The system-wide setting (Centralized or Decentralized) stored per customer site |

---

## 3. API Overview

### Base URL
```
{customer_site_url}/wp-json/transitquote/v1/
```
Configured per customer (multi-tenant by configuration, not by server).

### Authentication
OAuth 2.0 authorization-code flow — **two steps** (verified live; see [`docs/API_NOTES.md`](./docs/API_NOTES.md)).

- **Login (step 1):** `POST /rest_login` — provide username, password, client_id, client_secret → returns an **authorization `code`** + user data. The code is **not** a usable Bearer token.
- **Token (step 2):** `POST /oauth2/access_token` (form-encoded) — `grant_type=authorization_code` + code + client_id + client_secret → returns the **`access_token`**. _(This endpoint is in the `oauth2` namespace, not `transitquote/v1`.)_
- **Logout:** `POST /rest_logout` — revokes the access token
- All other endpoints: `Authorization: Bearer {access_token}` header required
- The **access token** (not the code) must be persisted securely on device (keychain / secure storage)

### Endpoint Summary

| Method | Path | Roles | Purpose |
|--------|------|-------|---------|
| `POST` | `/rest_login` | Public | Authenticate user, get access token |
| `POST` | `/rest_logout` | Public | Revoke token |
| `GET` | `/configuration` | Driver, Dispatch, Admin | App bootstrap — reference data + current user |
| `GET` | `/jobs` | Driver, Dispatch, Admin | List jobs (filtered by role/mode) |
| `GET` | `/jobs?id={id}` | Driver, Dispatch, Admin | Full job detail |
| `POST` | `/jobs/update_job_status` | Driver, Dispatch, Admin | Update job status |
| `POST` | `/jobs/update_assigned` | Dispatch, Admin | Assign driver to job |
| `GET` | `/customers` | Dispatch, Admin | List all customers |
| `GET` | `/customers/{id}` | Dispatch, Admin | Customer detail |
| `POST` | `/zapier_subscribe` | Public | Register webhook URL |
| `DELETE` | `/zapier_unsubscribe` | Public | Unregister webhook URL |

---

## 4. User Roles

### 4.1 Driver
- Views their own jobs (centralized) or all available jobs (decentralized)
- Receives push notifications for newly assigned jobs
- Opens job details: customer info, stops, route (open in native maps), pricing
- Updates job status at each stage
- Can self-assign from the open job pool (decentralized mode only)
- Cannot see customer list, cannot assign others

### 4.2 Dispatcher
- Views all jobs across all drivers
- Assigns and reassigns drivers to jobs
- Filters job list by driver, status, date range
- Views full job details including pricing
- Can update job status
- Views customer list and customer details

### 4.3 Administrator
- All Dispatcher capabilities
- (Future) configuration management

> **Role detection:** The `/configuration` endpoint returns the authenticated user's WordPress roles. The app uses this to render the correct navigation and features. The configuration response also returns the full driver record linked to the user if the user is a driver.

---

## 5. Job Assignment Modes

The assignment mode is returned by `/configuration` as `team_settings.job_assignment` — either `"Centralized"` or `"Decentralized"`. The app must adapt its UI accordingly. _(Verified live: the field is `job_assignment`, not `tt_job_assignment_mode`. See [`docs/API_NOTES.md`](./docs/API_NOTES.md).)_

### 5.1 Centralized Mode
- **Driver** sees only jobs where they are the assigned driver
- **Dispatcher** sees all jobs and can assign/reassign drivers from a dropdown
- Driver has no UI to claim or reassign jobs

### 5.2 Decentralized Mode
- **All users** see all unassigned jobs in a shared pool
- **Drivers** can claim jobs for themselves and, if permitted, assign to other drivers in their allowed list (`can_assign_to`)
- **Dispatcher/Admin** can always assign to any driver
- The driver's `can_assign_to` field (from `/configuration` > `drivers`) is the **driver id (string)** that driver may assign to — this must be enforced client-side and is also enforced server-side. _(Verified live: it is a driver-id string such as `"432"`, **not** a boolean — see [`docs/API_NOTES.md`](./docs/API_NOTES.md).)_

---

## 6. Features & Screens

### 6.1 Onboarding / Configuration

**Purpose:** First-time setup — point the app at a customer's WordPress site.

**Fields:**
- Site URL (e.g., `https://mycouriersite.com`)
- OAuth2 Client ID
- OAuth2 Client Secret

**Behaviour:**
- Validate the URL by calling `/rest_login` (will fail auth gracefully if wrong URL)
- Store site URL + client credentials securely
- Allow switching sites (multi-account support optional but recommended)

---

### 6.2 Login Screen

**Fields:** Username, Password  
**Actions:** Login button, "Forgot password" (opens site URL in browser)

**Behaviour:**
- `POST /rest_login` with username, password, client_id, client_secret
- On success: persist access token, fetch `/configuration`, route to appropriate home screen by role
- On failure: show error message from API response
- Token should be persisted to survive app restart (no re-login required)

---

### 6.3 Bootstrap / App Init

Called immediately after login and on each app launch (if token exists):

1. `GET /configuration` — fetch reference data and current user
2. Cache locally:
   - `team_settings` (assignment mode, driver role name)
   - `services` (id → name lookup)
   - `vehicles` (id → name lookup)
   - `status_types` (id → name lookup, for rendering and dropdowns)
   - `payment_status_types` (id → name lookup)
   - `drivers` list (for assignment dropdowns)
   - `user` (current user's role, driver_id if applicable)
3. Navigate to home screen appropriate for role

---

### 6.4 Job List Screen

**Accessible to:** All roles (content varies by role and mode)

#### Driver — Centralized Mode
- Shows only jobs assigned to this driver
- Sourced from `GET /jobs` (API filters server-side by driver_id for driver role)

#### Driver — Decentralized Mode
- Two tabs or toggle:
  - **Available** — unassigned jobs (no driver assigned)
  - **My Jobs** — jobs assigned to this driver
- Claim button on each available job → calls `POST /jobs/update_assigned`

#### Dispatcher / Admin
- Shows all jobs across all drivers
- Driver assignment control per job row (inline dropdown or job detail)

**List Item (Job Card):**
- Job reference
- Customer name
- Pickup address (first stop)
- Delivery address (last stop)
- Collection date/time
- Service type (from services lookup)
- Vehicle type (from vehicles lookup)
- Job status (from status_types lookup) — colour-coded
- Assigned driver name (dispatcher view only)
- Payment status badge

**Bottom Toolbar:**
A persistent toolbar is pinned to the bottom of the job list screen. It contains (at minimum):
- **Filter button** — opens the Filter Sheet (see below)
- **Refresh button** — triggers a manual reload of the job list
- Badge on the Filter button showing the number of active filters (hidden when zero)

**Filter Sheet (slide-up bottom sheet):**
Triggered by tapping the Filter button in the bottom toolbar. Slides up over the job list without navigating away. Contains:

- **Date range** — From and To date pickers (calendar or native date picker)
- **Status** — one checkbox / toggle chip per status type (list built from `configuration.status_types`); supports multi-select so the user can show e.g. "In Transit" + "Assigned" simultaneously
- **Driver** (Dispatcher / Admin only) — dropdown or searchable list of all drivers; single-select
- **Clear All** button — resets all filters and reloads the full list
- **Apply** button — fires the filtered job list request and closes the sheet (alternatively: live filtering — each change fires immediately without an explicit Apply tap; decide based on UX preference)

Filter state should persist across sessions (the web version stores filters per user server-side; the mobile app should at minimum persist them locally in device storage so the last-used filter is restored on next launch).

**Refresh:** Pull-to-refresh on the list; also background poll or push notification triggers refresh.

---

### 6.5 Job Detail Screen

**Accessible to:** All roles (some fields/actions vary)

**Layout Sections:**

#### A — Header
- Job reference number (large, prominent)
- Current status with colour chip
- Service type and vehicle type
- Received date/time

#### B — Route Summary
- Stops list in order: each stop shows address, visit type (Pickup/Delivery), contact name, contact phone, scheduled date/time
- ~~Interactive map showing all stops connected as a route~~ **REMOVED FROM SPEC.** The embedded
  map (`react-native-maps`) is not implemented. Locations and routes open in the device's native
  Google Maps via external links instead (see the map-link buttons below). Rationale: avoids a
  native dependency + per-tenant Google Maps API-key management; the deep-link covers US-014/US-015.
- Map link button → opens native Maps app with the full route (and per-stop tap → that location)
- Total distance and estimated time (from journey data)

#### C — Customer
- Customer name, email, phone
- Customer reference number (if present)
- Special instructions / description

#### D — Pricing
- Breakdown: Distance cost, Time cost, Surcharges, Basic cost, Tax, **Total**
- Currency from site configuration — `team_settings.currency` is a numeric **id** (e.g. `"18"`), with `custom_currency_code`/`custom_currency_symbol` and `tax_name`/`tax_rate` alongside (see [`docs/API_NOTES.md`](./docs/API_NOTES.md))
- Weight (if applicable)

#### E — Assignment (Dispatcher only / Decentralized)
- Current assigned driver (or "Unassigned")
- Assign Driver dropdown (all drivers) — calls `POST /jobs/update_assigned`
- In decentralized mode, drivers see assign button filtered to their `can_assign_to` list

#### F — Status Update
- Current status displayed
- "Update Status" button → opens status picker (list of all status_types)
- Calls `POST /jobs/update_job_status`
- Confirm dialog before submitting (to prevent accidental taps)

#### G — Payment
- Payment type (e.g., Card, Cash, Invoice)
- Payment status

---

### 6.6 Driver List Screen

**Accessible to:** Dispatcher, Admin only

**List Item:**
- Driver name (first + last)
- Email and phone
- Availability badge (Available / Unavailable)
- Number of currently assigned active jobs

**Actions:**
- Tap driver → Driver Detail screen

---

### 6.7 Driver Detail Screen

**Accessible to:** Dispatcher, Admin only

**Sections:**
- Name, email, phone
- Availability toggle (if editable via API — future)
- Assigned jobs list (subset of job list filtered to this driver)
- In decentralized mode: which drivers this driver can assign to

---

### 6.8 Customer List Screen

**Accessible to:** Dispatcher, Admin only

**List Item:**
- Full name, email, phone
- City/postcode

**Search:** Text filter on name, email, phone.

---

### 6.9 Customer Detail Screen

**Accessible to:** Dispatcher, Admin only

**Sections:**
- Full address
- Contact details
- Job history — list of jobs for this customer (link back to Job Detail)

---

### 6.10 Profile / Settings Screen

**Sections:**
- Current user name, role, email
- Driver details (if driver role): name, phone, availability status
- App settings: site URL, notification preferences
- Logout button

---

## 7. User Stories

### Authentication

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-001 | Any user | Log in with my username and password | I can access the app securely |
| US-002 | Any user | Stay logged in between app launches | I don't have to re-enter credentials every day |
| US-003 | Any user | Log out | I can protect my account on shared devices |
| US-004 | Admin | Configure the site URL and client credentials once | The app connects to my company's specific installation |

### Driver — Job Management

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-010 | Driver (centralized) | See only jobs assigned to me | I focus on my work without distraction |
| US-011 | Driver (decentralized) | See all available (unassigned) jobs | I can claim jobs that suit my location or schedule |
| US-012 | Driver | Claim an available job | It becomes mine to complete |
| US-013 | Driver | See full job details | I know where to go, who to collect from, and what to deliver |
| US-014 | Driver | See all stops as a route I can open in maps | I can plan my route efficiently _(via external Google Maps link — embedded map removed from scope, see §6.5B / §14)_ |
| US-015 | Driver | Tap a stop/route to open native navigation | I get turn-by-turn directions to each stop |
| US-016 | Driver | See contact name and phone for each stop | I can call ahead or communicate with customers |
| US-017 | Driver | Update the job status | Dispatch knows where each job is in real time |
| US-018 | Driver | Receive a push notification when a job is assigned to me | I know immediately without checking the app |
| US-019 | Driver (decentralized) | Assign a job to another driver in my allowed list | I can delegate work within my team |

### Dispatcher — Job Management

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-030 | Dispatcher | See all jobs across all drivers | I have a complete view of operations |
| US-031 | Dispatcher | Filter jobs by status, date, and driver | I can quickly find what I need |
| US-032 | Dispatcher | Assign a driver to any job | Jobs get covered by the right person |
| US-033 | Dispatcher | Reassign a job to a different driver | I can adjust when circumstances change |
| US-034 | Dispatcher | Update any job's status | I can correct status on behalf of a driver |
| US-035 | Dispatcher | See full pricing detail on each job | I can answer customer queries |
| US-036 | Dispatcher | View customer contact details | I can reach the customer directly |
| US-037 | Dispatcher | Receive a push notification when a new job comes in | I can assign it immediately |
| US-038 | Dispatcher | Receive a push notification when a job status changes | I can monitor progress without constant checking |

### Reference Data

| ID | As a... | I want to... | So that... |
|----|---------|--------------|------------|
| US-050 | Any user | See human-readable service, vehicle, and status names | The app makes sense without needing the backend admin |
| US-051 | Any user | See reference data even with poor connectivity | The app is usable offline or in low-signal areas |

---

## 8. Data Models (App-Side)

> ⚠️ **The JSON examples in this section are illustrative and predate live API access.**
> They are inaccurate in several respects (field names, string-vs-number typing, response
> envelope, `status_types` shape, nested job-detail structure). For the **authoritative,
> verified wire shapes** see [`docs/API_NOTES.md`](./docs/API_NOTES.md) and the typed
> definitions in [`types/api.ts`](./types/api.ts). Treat the structures below as intent, not contract.

These are the structures the app should model internally, derived from the API responses.

### User (from `/configuration` > `user`)
```json
{
  "wp_user_id": 5,
  "first_name": "Jane",
  "last_name": "Smith",
  "user_nicename": "janesmith",
  "roles": ["driver"],
  "avatar_url": "https://...",
  "driver_id": 3,
  "driver_first_name": "Jane",
  "driver_last_name": "Smith",
  "driver_email": "jane@example.com",
  "driver_phone": "07700900000",
  "driver_available": true,
  "driver_can_assign_to": false
}
```

### Driver (from `/configuration` > `drivers`)
```json
{
  "id": 3,
  "wp_user_id": 5,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane@example.com",
  "phone": "07700900000",
  "available": true,
  "can_assign_to": false,
  "roles": ["driver"]
}
```

> `can_assign_to`: **Verified live — this is a driver-id string (e.g. `"432"`), not a boolean.** It carries the driver id(s) this driver may assign to. When assigning, cross-reference against the `drivers` list. (The earlier "boolean" description was wrong; see [`docs/API_NOTES.md`](./docs/API_NOTES.md).)

### Job (list view, from `GET /jobs`)
```json
{
  "id": 42,
  "job_id": "JOB-2024-042",
  "job_ref": "042",
  "service_id": 1,
  "vehicle_id": 2,
  "description": "Fragile items",
  "customer_reference": "CUST-REF-001",
  "weight": 5.0,
  "payment_type_id": 1,
  "payment_status_id": 2,
  "status_type_id": 3,
  "customer_id": 7,
  "accepted_quote_id": 15,
  "created": "2024-01-15T09:00:00",
  "modified": "2024-01-15T10:30:00"
}
```

### Job Detail (from `GET /jobs?id={id}`)
Extends the Job model with:
```json
{
  "customer": {
    "id": 7,
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "07700900001",
    "address": "123 Main St",
    "city": "London",
    "postcode": "EC1A 1BB"
  },
  "journey": {
    "id": 10,
    "job_id": 42,
    "return_to_start": false,
    "distance": 15.3,
    "time": 45,
    "map_link": "https://maps.google.com/..."
  },
  "stops": [
    {
      "id": 20,
      "journey_id": 10,
      "address": "123 Main St, London",
      "location": { "lat": 51.5074, "lng": -0.1278 },
      "collection_date": "2024-01-15",
      "time_type": "AM",
      "datetime_type": "anytime",
      "visit_type": "collection"
    },
    {
      "id": 21,
      "journey_id": 10,
      "address": "456 High St, Manchester",
      "location": { "lat": 53.4808, "lng": -2.2426 },
      "collection_date": "2024-01-15",
      "time_type": "PM",
      "datetime_type": "anytime",
      "visit_type": "delivery"
    }
  ],
  "quote": {
    "id": 15,
    "job_id": 42,
    "distance_cost": 25.00,
    "rate_hour": 15.00,
    "time_cost": 11.25,
    "surcharges": 5.00,
    "basic_cost": 41.25,
    "rate_tax": 0.20,
    "tax_cost": 8.25,
    "total": 49.50
  },
  "payment": {
    "type": "Card",
    "status": "Paid"
  }
}
```

### Configuration (from `GET /configuration`)
```json
{
  "team_settings": {
    "tt_driver_role_name": "Driver",
    "tt_job_assignment_mode": "Centralized"
  },
  "services": [{ "id": 1, "name": "Same Day" }],
  "vehicles": [{ "id": 1, "name": "Van" }],
  "status_types": [
    { "id": 1, "name": "Pending" },
    { "id": 2, "name": "Assigned" },
    { "id": 3, "name": "In Transit" },
    { "id": 4, "name": "Delivered" }
  ],
  "payment_status_types": [{ "id": 1, "name": "Unpaid" }, { "id": 2, "name": "Paid" }],
  "drivers": [...],
  "user": {...}
}
```

---

## 9. Navigation Structure

```
App
├── Onboarding (first launch)
│   └── Site Configuration screen
├── Login screen
└── Main App (post-auth)
    ├── Driver role
    │   ├── Tab: Jobs
    │   │   ├── [Decentralized only] Available Jobs list
    │   │   ├── My Jobs list
    │   │   └── Job Detail
    │   │       ├── Route Summary (stops + "Open in Maps" link — no embedded map)
    │   │       └── Status Update sheet
    │   └── Tab: Profile
    │
    └── Dispatcher / Admin role
        ├── Tab: Jobs
        │   ├── All Jobs list (filterable)
        │   └── Job Detail
        │       ├── Route Summary (stops + "Open in Maps" link — no embedded map)
        │       ├── Driver Assignment
        │       └── Status Update sheet
        ├── Tab: Drivers
        │   ├── Driver list
        │   └── Driver detail (with their job list)
        ├── Tab: Customers
        │   ├── Customer list
        │   └── Customer detail (with job history)
        └── Tab: Profile
```

---

## 10. Push Notifications

The API supports webhooks via the Zapier-style subscribe/unsubscribe endpoints. The app should use these to receive real-time updates.

### Notification Types

| Event | Notification Type ID | Target Audience |
|-------|---------------------|-----------------|
| New job submitted | 1 | Dispatcher |
| Job status updated | 2 | Dispatcher + Assigned Driver |
| Quote requested | 3 | Dispatcher (optional) |

### Implementation Options (in priority order)

**Option A — Push via FCM/APNs through an intermediary:**
1. App registers a webhook URL pointing to a relay server (or cloud function)
2. Relay receives the webhook POST from WordPress and sends FCM/APNs push to the specific device
3. App registers the webhook URL: `POST /zapier_subscribe` with the relay URL and notification type
4. On logout or app uninstall: `DELETE /zapier_unsubscribe` with the webhook ID

**Option B — Polling (fits naturally with offline-first sync):**
- The background sync cycle (see §11.4) already pulls fresh job data on reconnect and at regular intervals
- Compare incoming server data against the local DB to detect new or changed jobs
- Trigger local notifications for new assignments or status changes
- No separate polling mechanism needed — notifications are a by-product of the sync

**Webhook Payload received by relay (example — new job):**
```json
{
  "event_type_id": 1,
  "event_name": "new_job",
  "data": {
    "id": 42,
    "job_ref": "042",
    "customer": { "first_name": "John", "last_name": "Doe" },
    "journey": { "map_link": "..." },
    "quote": { "total": 49.50 },
    "assigned": {
      "driver_id": 3,
      "first_name": "Jane",
      "last_name": "Smith"
    }
  }
}
```

> Note: The `assigned` field is added to webhook payloads by TransitTeam when a driver is assigned to the job.

---

## 11. Offline-First Architecture

This is a core architectural requirement, not an enhancement. The app must be designed offline-first from the ground up. Poor mobile signal is normal operating conditions for field drivers, not an edge case.

### 11.1 Core Principle

The app's UI always reads from the **local database**. The network layer syncs in the background. The user never waits for a network call to see their data — they see what is stored locally, which is kept as fresh as connectivity allows.

### 11.2 Local Database

The app maintains an on-device relational database (e.g. SQLite via a suitable ORM for the chosen framework) that mirrors the server-side data the user is permitted to see.

**Tables to maintain locally:**

| Local Table | Source | Notes |
|-------------|--------|-------|
| `jobs` | `GET /jobs` | Full list of jobs visible to this user |
| `job_details` | `GET /jobs?id={id}` | Customer, journey, stops, quote per job |
| `drivers` | `GET /configuration` | Full driver list |
| `services` | `GET /configuration` | Reference lookup |
| `vehicles` | `GET /configuration` | Reference lookup |
| `status_types` | `GET /configuration` | Reference lookup |
| `payment_status_types` | `GET /configuration` | Reference lookup |
| `team_settings` | `GET /configuration` | Assignment mode, role name |
| `current_user` | `GET /configuration` | Logged-in user's profile + driver record |
| `outbox` | Local only | Pending actions queued for upload (see §11.5) |
| `sync_meta` | Local only | Timestamps of last successful sync per table |

### 11.3 First Launch Flow

```
Install app
  └─ Onboarding: enter site URL + client credentials
       └─ Login screen: enter username + password
            └─ [Online] POST /rest_login → receive access token
                 └─ Initial full sync:
                      ├─ GET /configuration  → populate reference tables + current_user
                      └─ GET /jobs           → populate jobs table
                           └─ For each job: GET /jobs?id={id}  → populate job_details
                                └─ Home screen (reading from local DB)
```

The initial sync may take a few seconds if there are many jobs. Show a progress indicator during first sync. Once complete, the app is fully usable offline.

### 11.4 Ongoing Sync

**Foreground sync (app is open):**
- On app launch: check connectivity → if online, trigger a background sync
- Pull-to-refresh on any list: triggers an immediate sync of that data type
- After any successful write (status update, driver assignment): immediately re-fetch affected job and update local DB

**Background sync (app is in background):**
- When the OS permits background execution, attempt to flush the outbox and pull any changes
- Frequency is OS-dependent; do not rely on background sync for time-critical updates

**Connectivity detection:**
- Monitor network reachability continuously
- When transitioning from offline → online: automatically trigger a sync (outbox flush first, then pull)
- Show a visible connectivity status indicator (e.g. a banner or status bar colour change) so the user always knows whether they are online or offline

### 11.5 Outbox — Pending Action Queue

Any action the user takes while offline (or that fails due to connectivity) is written to a local `outbox` table rather than discarded.

**Outbox record structure:**
```
id            — local auto-increment
action_type   — 'update_job_status' | 'update_assigned'
payload       — JSON of the request body (e.g. { "id": 42, "status_type_id": 3 })
created_at    — local timestamp when the action was queued
attempts      — number of upload attempts made
last_error    — last error message from the server (for display)
status        — 'pending' | 'in_progress' | 'failed' | 'synced'
```

**Outbox flush logic (runs on connectivity restore and on foreground sync):**
1. Select all records with `status = 'pending'`, ordered by `created_at` ASC
2. For each record: submit the API call
   - On success: mark `status = 'synced'`, update the local job record with the server's response
   - On 4xx error (bad request, permission denied): mark `status = 'failed'`, store `last_error`; do not retry automatically — surface to the user
   - On 5xx or network error: leave as `pending`, increment `attempts`; retry on next sync
3. After flushing, pull fresh data from the server to reconcile any changes

**UI for outbox state:**
- Pending actions shown as a subtle indicator on the affected job card (e.g. a clock icon or "Pending sync" label)
- A dedicated "Pending" section or banner on the job list when the outbox is non-empty
- Failed actions shown with a warning icon and the error message; option to retry manually or discard
- Once synced, the indicator clears

### 11.6 Conflict Resolution

A conflict occurs when the same job has been modified both locally (in the outbox) and on the server since the last sync.

**Strategy: server wins, user is notified**

- After flushing the outbox, pull the latest server state for any job that had a pending action
- If the server's current state differs from what the app expected (i.e. the job was changed by someone else), display a notification: _"Job #042 was updated by another user while you were offline. Your change has been applied on top — check the current status."_
- Do not silently discard either version; always apply the outbox action first, then show the resulting server state

### 11.7 What Works Offline

| Feature | Offline behaviour |
|---------|------------------|
| View job list | Full list from local DB |
| View job detail | Full detail from local DB including stops, customer, pricing |
| Open route/stop in maps | Deep-link is built from locally-stored coordinates; the native Google Maps app handles online/offline itself (no embedded map in-app) |
| Filter job list | Fully local — no network needed |
| Update job status | Queued to outbox; applied to local DB immediately (optimistic update); synced when online |
| Assign / claim job | Queued to outbox; applied optimistically; synced when online |
| View driver list | From local DB |
| View customer detail | From local DB |
| Login | Requires connectivity — cannot authenticate offline |
| Initial setup | Requires connectivity |

### 11.8 Optimistic Updates

When the user updates a job status or claims a job while offline (or before the server responds), update the local database immediately so the UI reflects the change at once. Mark the record as "pending sync." If the server subsequently rejects the action, roll back the local change and notify the user.

### 11.9 Sync Status UI

The user should always be able to tell the state of their data:

- **Online, synced:** No indicator needed (default state)
- **Online, syncing:** Subtle activity indicator (spinner in toolbar or status bar)
- **Offline:** Persistent banner or icon: _"Offline — showing last synced data"_ with a timestamp: _"Last updated 14 minutes ago"_
- **Outbox not empty:** Badge count on the sync indicator showing how many actions are pending
- **Sync failed:** Warning state with option to retry

---

## 12. Multi-Site / Multi-Account Support (Optional but Recommended)

Courier companies may run multiple WordPress installations (different operating regions). The app should allow:
- Storing multiple site configurations (site URL + client credentials + account)
- Switching between sites without re-entering credentials
- Clear visual indication of which site is currently active

---

## 13. Technical Constraints & Integration Notes

### API Constraints
- No rate limiting is currently implemented — reasonable polling is acceptable
- All responses follow the pattern `{ "data": ..., "success": true/false, "message": "..." }`
- Error responses include a `message` field with human-readable detail
- Dates are ISO 8601 format; datetimes use `YYYY-MM-DDTHH:MM:SS`
- The API is stateless — re-authenticate if token expires (401 response)

### Known API Behaviour
- `GET /jobs` filters automatically based on the authenticated user's role: drivers in centralized mode only receive their assigned jobs; dispatchers receive all jobs
- The `driver_id` filter parameter in `GET /jobs` is supported for dispatcher views
- The `status_type_id` filter accepts comma-separated IDs
- Job detail requires a separate call `GET /jobs?id={id}` — the list endpoint does not return nested customer/stops/quote data
- The configuration endpoint is the canonical source of truth for all reference data (services, vehicles, status types, drivers) — fetch and cache on app start

### Authentication Notes
- The OAuth2 client_id and client_secret are configured per WordPress installation by the site admin
- These credentials are not user-specific — all users on the same site use the same client credentials
- Access tokens are tied to a specific WordPress user account
- Token expiry is handled server-side; the app should handle 401 responses by redirecting to login

### WordPress Role Mapping
| API role string | App role |
|----------------|----------|
| `"driver"` (or the configured driver role name) | Driver |
| `"dispatch"` | Dispatcher |
| `"administrator"` | Admin (same UI as Dispatcher + future config) |

> The driver role name is configurable per site (defaults to "Driver") and is returned in `configuration.team_settings.tt_driver_role_name`. The app should use this for display but rely on the `user.roles` array for access control decisions.

---

## 14. Future / Out of Scope for v1

The following are not required for the initial release but are noted for the product roadmap:

- **Driver availability toggle** — no API endpoint yet to update `driver.available`
- **Create new job** — no API endpoint for job creation (jobs come from the TransitQuote Pro booking form)
- **Customer contact history / notes** — not in current API
- **Photo proof of delivery** — no endpoint for file uploads
- **Driver-to-driver messaging / chat**
- **Live GPS tracking** — no location reporting endpoint exists
- **Per-stop status updates** — the API supports `update_job_location_status` but this is an admin AJAX endpoint, not a REST endpoint; would need to be added to the API plugin
- **Invoice / payment processing**
- **Driver earnings / reporting**
- **Embedded in-app route map** — removed from scope. Routes and stop locations open in the
  device's native Google Maps via external links (US-014/US-015 satisfied by the deep-link); an
  embedded `react-native-maps` view would add a native dependency and per-tenant API-key
  management for no functional gain over the external link.

---

## 15. Acceptance Criteria Summary

### Authentication
- [ ] User can log in with valid credentials and reach the correct home screen for their role
- [ ] Invalid credentials show a clear error message
- [ ] Token is persisted; user is not asked to log in again on next launch
- [ ] Logout clears the token and returns to login screen

### Driver — Centralized
- [ ] Driver sees only jobs assigned to them
- [ ] Job list shows reference, customer name, pickup/delivery addresses, status, collection date/time
- [ ] Tapping a job opens full job detail
- [ ] Job detail shows all stops with addresses, visit type, contact details
- [ ] Job detail shows full pricing breakdown
- [ ] Driver can tap the map link to open the route/stop in native maps navigation (external link; no embedded map)
- [ ] Driver can update job status via a status picker
- [ ] Status update is reflected immediately in the UI

### Driver — Decentralized
- [ ] Driver sees available (unassigned) jobs in a separate tab/view
- [ ] Driver can claim an available job (assign to themselves)
- [ ] Driver can assign a job to another driver in their `can_assign_to` list (if permitted)
- [ ] Server returns an error if driver tries to assign to a driver outside their allowed list

### Dispatcher
- [ ] Dispatcher sees all jobs regardless of assignment
- [ ] Dispatcher can filter by status, date range, and driver
- [ ] Dispatcher can assign any driver to any unassigned or reassign from any job detail screen
- [ ] Dispatcher can update any job status
- [ ] Dispatcher can view all customers and their contact details

### Offline-First
- [ ] Job list is visible immediately on launch from the local database — no network wait
- [ ] Job detail is visible offline for any job previously synced
- [ ] Filter sheet works fully offline (filters local data)
- [ ] Status update made while offline is queued in the outbox and reflected immediately in the UI (optimistic update)
- [ ] Queued action is automatically submitted when connectivity is restored
- [ ] Failed outbox action (server rejected) surfaces a visible error with option to retry or discard
- [ ] App shows a clear offline indicator and "last synced" timestamp when there is no connectivity
- [ ] On reconnect, outbox is flushed before pulling fresh data
- [ ] If a job was changed server-side while the app was offline, the user is notified after sync

### Performance
- [ ] Job list is visible with zero network latency on every launch after initial setup
- [ ] Initial full sync completes with a progress indicator and is non-blocking (can cancel and use cached data)
- [ ] Background sync does not cause visible UI jank or interruption
