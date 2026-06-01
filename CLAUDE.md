# TransitTeam Mobile — CLAUDE.md

## Specification Reference
The full product specification is in `MOBILE_APP_REQUIREMENTS.md` at the project root.
Always consult this file before making architectural or feature decisions.
This CLAUDE.md summarises the key patterns and constraints — the spec is the source of truth.

---

## Project Overview

Native mobile companion for courier companies using TransitTeam (a WordPress dispatch plugin).
- **Drivers** receive and manage jobs in the field
- **Dispatchers** assign jobs, monitor status, and track their fleet
- The app connects to each customer's own WordPress installation via a REST API
- Multi-tenant by configuration: each customer site has its own URL and OAuth2 credentials
- **Offline-first is not an enhancement — it is a core architectural requirement**

---

## Tech Stack

> **Source of truth for versions = `package.json`.** This stack runs the React Native
> New Architecture (mandatory on RN 0.85). Any library added must be New-Arch compatible —
> verify with `npx expo-doctor` / React Native Directory before installing.

- Expo SDK 56, React Native 0.85, React 19, TypeScript strict mode
- Expo Router v6 (file-system routing)
- Zustand — client/session state (current user, config, assignment mode)
- TanStack Query v5 — server state and sync orchestration
- **expo-sqlite + Drizzle ORM** — local SQLite database (offline-first, reactive queries via `useLiveQuery`). See `docs/DB_ENGINE_DECISION.md` (ADR-001). _Replaces WatermelonDB — that engine is incompatible with the New Architecture._
- expo-secure-store — OAuth2 tokens and client credentials
- expo-notifications — push notifications
- expo-network — connectivity detection
- expo-linking — "Open in Maps" deep-links for routes/stops (the embedded `react-native-maps`
  view was removed from scope — routes open in the device's native Google Maps; see spec §6.5B/§14)

---

## Architecture Principles

### 1. Offline-First (Non-Negotiable)
The UI ALWAYS reads from the local SQLite (expo-sqlite/Drizzle) database. Never fetch from the API to render a screen.
The network layer syncs in the background and updates the local DB; the UI reacts to DB changes via `useLiveQuery`.

Data flow:
```
User action → Local DB write (optimistic) → Outbox queue → Background sync → Server
Server data → Background sync → Local DB write → Reactive UI update
```

Never do this:
```typescript
// ❌ WRONG — renders blank until network responds
const jobs = await api.getJobs();
setJobs(jobs);
```

Always do this:
```typescript
// ✅ CORRECT — renders immediately from local DB; sync runs in background
const jobs = useJobsQuery(); // wraps Drizzle useLiveQuery — reactive on DB change
```

### 2. SOLID Principles

**Single Responsibility**
- Each component renders one thing. Each hook owns one concern.
- API calls live only in `services/`. DB queries live only in `database/queries/`.
- No component fetches from the API directly — ever.

**Open/Closed**
- Role-based UI differences resolved via composition, not if/else sprawl.
- Add new role behaviour by composing new components, not modifying existing ones.
- Use feature flags / role guards as wrappers, not conditionals inside components.

**Liskov Substitution**
- All list screens accept a standardised job array. Driver list and Dispatcher list
  are different data sources feeding the same JobList component interface.

**Interface Segregation**
- Props interfaces are minimal and specific. Never pass a full Job object when
  a component only needs `job.id` and `job.status_type_id`.

**Dependency Inversion**
- Components depend on hook abstractions, not on Drizzle/expo-sqlite or TanStack Query directly.
- `useJobs()`, `useJobDetail(id)`, `useDrivers()` are the interface — their internals can change.

### 3. Separation of Concerns

```
components/   → renders only, zero business logic
hooks/        → business logic, zero JSX
services/     → API calls only, zero state
database/     → DB schema, queries, and sync logic only
stores/       → session state only (auth, config, connectivity)
```

### 4. Role-Based Access
- Role is determined ONLY from `configuration.user.roles` returned by the API.
- Role name strings (e.g. "Driver") are for display only — never use for access control.
- Use `can_assign_to` from the drivers list for assignment permission, not client-side assumptions.
- All role enforcement is also enforced server-side — the client guards UX, not security.

### 5. Error Handling
Every async operation must handle three states explicitly: loading, success, and error.
API errors surface the `message` field from the **error** response (`{ code, message, data.status }`) to the user — note success responses have no `message`.
Network errors distinguish between offline (expected) and unexpected failure.
401 responses redirect to the login screen and clear the stored token.

### 6. Immutability
Never mutate state directly. Zustand: use `set()` with new objects.
SQLite (Drizzle): never issue ad-hoc writes — batch related writes in `db.transaction(...)`.

---

## Folder Structure

```
app/                          ← Expo Router routes
  (auth)/
    onboarding.tsx            ← Site URL + OAuth2 credentials setup
    login.tsx
  (driver)/
    jobs/
      index.tsx               ← Driver job list (centralized or decentralized tabs)
      [id].tsx                ← Job detail
    profile.tsx
  (dispatcher)/
    jobs/
      index.tsx               ← All jobs list with filter sheet
      [id].tsx                ← Job detail
    drivers/
      index.tsx
      [id].tsx
    customers/
      index.tsx
      [id].tsx
    profile.tsx

components/
  jobs/                       ← JobCard, JobStatusBadge, JobFilterSheet, StopList (no RouteMap — embedded map out of scope; "Open in Maps" deep-link instead)
  drivers/                    ← DriverCard, DriverBadge, DriverPicker
  customers/                  ← CustomerCard
  shared/                     ← Button, Badge, BottomSheet, EmptyState, ErrorBoundary
  sync/                       ← SyncStatusBanner, OutboxIndicator, OfflineBanner

hooks/
  useJobs.ts                  ← reactive jobs query (Drizzle useLiveQuery)
  useJobDetail.ts
  useDrivers.ts
  useCustomers.ts
  useJobFilters.ts
  useSync.ts                  ← Sync orchestration
  useOutbox.ts                ← Outbox queue management
  useConnectivity.ts          ← Online/offline state
  useRole.ts                  ← Current user role + permission checks

services/
  api/
    auth.ts                   ← POST /rest_login, POST /rest_logout
    configuration.ts          ← GET /configuration
    jobs.ts                   ← GET /jobs, GET /jobs?id=, POST update_job_status, POST update_assigned
    customers.ts              ← GET /customers, GET /customers/{id}
    notifications.ts          ← POST /zapier_subscribe, DELETE /zapier_unsubscribe
  apiClient.ts                ← Axios instance, base URL injection, auth headers, 401 handling

database/
  schema.ts                   ← Drizzle table + column definitions (the typed source of truth)
  client.ts                   ← expo-sqlite connection + drizzle() instance + migration runner
  migrations/                 ← drizzle-kit generated SQL migrations
  queries/
    jobs.ts
    drivers.ts
    customers.ts
    outbox.ts
    syncMeta.ts
  sync/
    syncEngine.ts             ← Full sync orchestration (foreground + background)
    outboxFlusher.ts          ← Outbox flush logic (see spec §11.5)
    # Conflict resolution (spec §11.6) is server-wins by construction — the pull overwrites
    # local rows (replaceJobs in queries/jobs.ts), so no standalone conflictResolver module
    # exists. Add one only if notify-on-silent-overwrite is implemented.

stores/
  authStore.ts                ← Access token, site URL, client credentials, logout
  configStore.ts              ← team_settings, services, vehicles, status_types, current user
  connectivityStore.ts        ← Online/offline state, last synced timestamp

constants/
  colours.ts
  typography.ts
  spacing.ts

utils/
  formatters.ts               ← Date/currency/address formatting
  roleGuards.ts               ← Permission check utilities

types/
  api.ts                      ← API response shapes (Job, Driver, Customer, Configuration)
  app.ts                      ← App-internal types (RoleType, AssignmentMode, etc.)
  navigation.ts               ← Expo Router typed routes
```

---

## Local Database Schema

Mirror the spec (§11.2) exactly. Key tables:

```
jobs               id, job_ref, service_id, vehicle_id, status_type_id,
                   customer_id, accepted_quote_id, description,
                   customer_reference, weight, payment_type_id,
                   payment_status_id, created, modified

job_details        job_id (FK), customer_json, journey_json, stops_json,
                   quote_json, payment_json

drivers            id, wp_user_id, first_name, last_name, email, phone,
                   available, can_assign_to, roles_json

services           id, name
vehicles           id, name
status_types       id, name
payment_status_types  id, name
team_settings      id (single row), assignment_mode, driver_role_name

current_user       id (single row), wp_user_id, first_name, last_name,
                   roles_json, driver_id

outbox             id, action_type, payload_json, created_at,
                   attempts, last_error, status

sync_meta          table_name, last_synced_at
```

Define each table as a Drizzle table in `schema.ts` (the typed source of truth).
JSON blob columns (e.g. `*_json`) use `text({ mode: 'json' })`; foreign keys use Drizzle
`references(...)`. Generate migrations with `drizzle-kit`; run them on app start.

---

## API Layer Rules

- All API calls go through `services/apiClient.ts` — never call `fetch` directly
- Base URL is injected from `authStore.siteUrl` at runtime
- Auth header `Authorization: Bearer {token}` is set automatically via Axios interceptor
- 401 responses → clear token in `authStore`, redirect to login screen
- **Auth is a two-step OAuth2 flow:** `POST /rest_login` → authorization `code`, then `POST /oauth2/access_token` → `access_token`. Persist the **access token**, not the code. (See `docs/API_NOTES.md`.)
- **Success responses are `{ data, success }` — there is NO `message` field on success.** Always check `success`. Only **error** responses carry `message` (WordPress error shape `{ code, message, data.status }`).
- **The wire is string-typed (WordPress):** ids, money, booleans (`"0"`/`"1"`) all arrive as strings and may be null — coerce in the mapping layer, never compare a wire value to a number/boolean. Raw wire shapes live in `types/api.ts`.
- Dates are MySQL datetimes (`"YYYY-MM-DD HH:MM:SS"`) and may be the zero sentinel `"0000-00-00 00:00:00"` — parse with `dayjs`, never `new Date()`; guard the sentinel as null.
- **`apiClient` strips a PHP `Deprecated` warning** prepended to `/configuration` and `/jobs` JSON via `transformResponse`. This is a **temporary** workaround — the server team is fixing the warning; once fixed the strip is a no-op and can be removed. (See `docs/API_NOTES.md` §5.)
- The API has no rate limiting — reasonable polling is acceptable (see sync intervals below)

### Sync Intervals
- Foreground: on app launch, on pull-to-refresh, after every successful write
- Background: when OS permits (use expo-background-fetch)
- On connectivity restore: immediate outbox flush, then full pull

---

## Outbox Pattern (Offline Writes)

When the user takes an action (update status, assign driver):
1. Write to `outbox` table with `status = 'pending'`
2. Apply optimistic update to local `jobs` table immediately
3. Attempt to flush outbox — if online, submit immediately
4. On success: mark `status = 'synced'`, update local record with server response
5. On 4xx: mark `status = 'failed'`, store `last_error`, surface to user — do NOT retry automatically
6. On 5xx or network error: leave as `pending`, increment `attempts`, retry on next sync

See spec §11.5 for full outbox record structure and flush logic.

---

## Role & Assignment Mode Patterns

Two axes control the UI:
- **User role:** `driver` | `dispatch` | `administrator`
- **Assignment mode:** `Centralized` | `Decentralized` (from `team_settings.job_assignment`)

Never hardcode role name strings for access control. Always use:
```typescript
const { role, assignmentMode } = useRole();
const isDriver = role === 'driver';
const isDispatcher = role === 'dispatch' || role === 'administrator';
const isDecentralized = assignmentMode === 'Decentralized';
```

Driver job list conditionals:
- Centralized: `GET /jobs` filtered server-side to this driver
- Decentralized: two tabs — Available jobs (no driver) + My Jobs

Assignment permissions (decentralized):
- `can_assign_to` (on each `drivers[]` entry) is a **driver-id string** (e.g. `"432"`), NOT a boolean — it names the driver id(s) that driver may assign to. There is no `user.driver_can_assign_to` field.
- Cross-reference `can_assign_to` against the `drivers` list at assignment time
- Server also enforces this — a 4xx error means the assignment was rejected; surface the error

---

## Push Notifications

Start with **Option B (polling-based local notifications)** from spec §10:
- The background sync cycle already detects new/changed jobs
- Compare incoming server data against local DB to detect changes
- Trigger `expo-notifications` local notifications for new assignments or status changes

Only implement FCM/APNs relay (Option A) if Option B proves insufficient for UX requirements.

---

## Multi-Site Support

Implement from the start — it is "optional but recommended" in the spec (§12) but
retrofitting multi-account support is significantly more complex than building it in.

- Store site configs in `expo-secure-store` as a keyed array
- Each config: `{ id, siteUrl, clientId, clientSecret, lastUsed }`
- `authStore.activeSiteId` determines which config is used for all API calls
- Allow switching sites from the Profile/Settings screen
- Show active site name prominently in Profile screen header

---

## Authentication & Security

- OAuth2 access token stored in `expo-secure-store` — never in AsyncStorage
- OAuth2 client_id and client_secret stored in `expo-secure-store` — site-level credentials
- Token persists across app restarts — no re-login unless token expires or user logs out
- On 401: clear token, redirect to login — do not silently re-authenticate
- On logout: call `POST /rest_logout`, clear token, clear local DB, navigate to login

---

## Connectivity & Sync Status UI

The user must always know the state of their data (spec §11.9):
- **Online, synced:** No indicator (default)
- **Online, syncing:** Subtle spinner in toolbar
- **Offline:** Persistent `OfflineBanner` — "Offline — showing data last updated X minutes ago"
- **Outbox non-empty:** Badge on sync indicator with count of pending actions
- **Sync failed:** Warning state with retry option
- **Outbox item failed:** Warning icon on affected job card + error message with retry/discard

---

## Coding Standards

### Component Rules
- Functional components only
- One component per file — filename matches component name (PascalCase)
- No business logic in components — extract to hooks
- No API calls in components — ever
- No direct DB access (Drizzle/expo-sqlite) in components — use hooks
- All lists must handle: empty state, loading state, error state, offline state
- Confirm dialogs required before status updates and job assignments (prevent accidental taps)

### Hook Rules
- One concern per hook (useJobDetail, not useJobDetailAndRelatedStuff)
- Hooks must not contain JSX
- Hooks return stable references — memoize callbacks with useCallback

### TypeScript Rules
- Strict mode — no `any`, no `as unknown as X`
- API response shapes defined in `types/api.ts` — validate on receipt
- Never assume optional fields are present — always null-check

### Naming Conventions
- Components: PascalCase (`JobCard.tsx`)
- Hooks: camelCase with `use` prefix (`useJobDetail.ts`)
- Stores: camelCase with `Store` suffix (`authStore.ts`)
- Constants: SCREAMING_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- Database queries: verb + noun (`getJobById`, `getPendingOutboxItems`)

---

## Testing Standards

- Unit tests: Jest + React Native Testing Library
- Test files: `__tests__/` adjacent to source file
- Each hook must have tests for: loading state, success state, error state, offline state
- Each outbox operation must have tests for: pending, synced, failed, retry behaviour
- Role-based rendering: test that driver does NOT see dispatcher-only UI elements
- **Maestro E2E (Android):** login flow, job list, status update, offline mode. Black-box,
  driven over ADB — fits Expo + RN 0.85 New Arch (supersedes the Detox plan). Flows live in
  `.maestro/`; target elements by `testID`. Setup + run loop: `docs/SMOKE_TESTING.md`.
  Runner lives in WSL2 against the Windows-host emulator; the build stays on Windows.

---

## Commands

```powershell
npx expo start                                      # start Metro (Expo Go)
npx expo run:android                               # run on Android emulator
npx jest --watchAll                                # unit tests
npx jest --coverage                                # coverage report
tsc --noEmit                                       # type check
eslint . --fix                                     # lint
eas build --platform ios --profile preview         # iOS cloud build
eas build --platform android --profile preview     # Android build via EAS
```

### Build Recovery
```powershell
cd android && ./gradlew clean && cd ..             # Android build failure
npx expo start --clear                             # Metro cache issues
```

---

## Out of Scope for v1

Do not implement — these are explicitly deferred in the spec (§14):
- Driver availability toggle (no API endpoint)
- Create new job (no API endpoint)
- Photo proof of delivery (no file upload endpoint)
- Live GPS tracking (no location reporting endpoint)
- Per-stop status updates (AJAX only, not REST)
- Embedded in-app route map (`react-native-maps`) — removed; use the "Open in Maps" deep-link
- Driver-to-driver messaging
- Invoice / payment processing
- Driver earnings / reporting

If asked to implement any of the above, refer back to this list and the spec.

---

## Common Mistakes to Avoid

- Do not fetch from the API inside a component render cycle
- Do not use AsyncStorage for tokens or credentials — always expo-secure-store
- Do not assume the assignment mode is Centralized — always read from configStore
- Do not use role display name strings for access control — use the roles array
- Do not silently swallow 4xx API errors — they indicate rejected actions; surface them
- Do not retry 4xx outbox failures automatically — they require user intervention
- Do not hardcode currency symbols — use the currency from site configuration
- Do not use `new Date(dateString)` — use `dayjs` for ISO 8601 parsing
- Do not navigate without checking auth state — all routes behind (auth) must check token
