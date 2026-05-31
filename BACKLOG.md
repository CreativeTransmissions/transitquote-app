# TransitTeam Mobile — Backlog

The single tracked task list. Checkboxes are the progress signal — tick them as work lands.
Tasks trace to user stories (`US-xxx`) and §15 acceptance criteria (`AC`) in
[`MOBILE_APP_REQUIREMENTS.md`](./MOBILE_APP_REQUIREMENTS.md). Milestones are defined in
[`ROADMAP.md`](./ROADMAP.md). Every item must meet the **Definition of Done** in the roadmap.

Status key: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked (see Open Questions).

---

## ⚠️ Open Questions

_All M1-blocking questions resolved 2026-05-30 against the live test site — see
[`docs/API_NOTES.md`](./docs/API_NOTES.md). Two new items deferred to when their features land._

- [x] **`can_assign_to` shape.** RESOLVED — it's a **driver-id string** (e.g. `"432"`), not a
  boolean. Cross-reference against the `drivers` list at assignment time. _(Unblocks US-019, US-012.)_
- [x] **Live API access.** RESOLVED — live test site + OAuth2 client_id/secret in hand; full
  `rest_login → access_token → configuration/jobs/customers` round-trip verified.
- [x] **Currency source.** RESOLVED — `team_settings.currency` is a numeric **id** (`"18"`), with
  `custom_currency_code`/`custom_currency_symbol`, `tax_name`/`tax_rate` alongside.
- [x] **`/jobs?id=` vs nested detail.** RESOLVED — list is flat (no nested data; carries a heavy
  per-job `settings_snapshot` blob); detail (`?id=`) returns nested customer/journey/stops/quote.
  The sync engine **must hydrate detail per job**.
- [x] **Map provider + keys.** RESOLVED — Google Maps (`google_maps_v3`); the key is supplied in
  `team_settings.api_key`/`api_key_v3`. No separate key provisioning for the test site.

**New — verify when the feature is built (non-blocking):**
- [ ] **Centralized server-side filtering.** Driver and Dispatch `GET /jobs` returned identical
  41-job lists — "filtered to this driver" was not observed. Confirm before relying on it (else
  filter by `driver_id` client-side). _(US-010.)_
- [x] **Write endpoint shapes.** Verified live (reversibly). `update_job_status` = JSON `{id, status_type_id}`
  → `{data:<job>, success}`. `update_assigned` has **two server bugs** (JSON crashes it → needs
  form-urlencoding; `driver_id` must be `drivers.id`) and an unconfirmed happy path — see
  [`docs/API_NOTES.md`](./docs/API_NOTES.md) §10. _(US-017 unblocked; US-019 partially.)_
- [~] **User-with-no-driver-record.** The `api-driver` test user's `wp_user_id` isn't in
  `/configuration` > `drivers`, so derived `current_user.driver_id` is null. **Decided (M2):** "My Jobs"
  shows an **empty** list (and Claim is hidden) when `driver_id` is null — `myJobsQuery(-1)` matches
  nothing. Confirm this is the desired UX once a properly-linked driver user is available. _(US-010, US-011.)_
- [ ] **Decentralized assignment happy path.** Claim/assign code is complete and queues through the
  outbox, but the live `update_assigned` success path is unverified (the only test driver is
  unavailable / has no driver record). Verify against a real assignable driver. _(US-012, US-019.)_

---

## Milestone 0 — Foundation  (mostly done)

- [x] Reconcile docs to real stack; pick DB engine (ADR-001).
- [x] Install core libs + tooling (ESLint, Jest, EAS); verify typecheck/lint/test green.
- [x] Scaffold `constants/` + `utils/` with first passing unit test.
- [x] **Node version** — on v24.16.0 (satisfies RN 0.85's `^24.3.0`); no `EBADENGINE` warnings.
- [x] Obtain staging API credentials — live test site + OAuth2 creds in hand; round-trip verified.
- [x] Capture real API payloads; correct `types/api.ts` + API docs to verified wire shapes (`docs/API_NOTES.md`).
- [x] Define Drizzle schema (`database/schema.ts`) mirroring spec §11.2; first migration generated (`db:generate`).
- [x] `database/client.ts` — expo-sqlite connection + drizzle instance; migration runner on boot (`useDatabase` → `BootGate`).
- [x] `database/mappers.ts` + `utils/coerce.ts` — API→DB coercion boundary (string wire → typed rows). Unit-tested.

## Milestone 1 — Walking skeleton

**Auth & bootstrap** (US-001, US-002, US-004 · AC: Authentication)
- [x] `services/api/auth.ts` — two-step `rest_login` → `oauth2/access_token`; `rest_logout`.
- [x] `services/apiClient.ts` — axios instance, base URL + Bearer from `authStore`, 401 → `clearSession`, PHP-warning-stripping `transformResponse`.
- [x] `authStore` — token + (multi-site) config in **expo-secure-store**; `hydrate()` restores across restart.
- [x] `services/api/{configuration,jobs,customers}.ts` — typed read endpoints + (unverified) write endpoints.
- [x] Onboarding screen — site URL + client_id/secret → `saveSiteConfig` (`useOnboarding`).
- [x] Login screen — real form, error surfacing via `getApiErrorMessage`, role-based home redirect (`useLogin`).
- [x] `GET /configuration` → seed reference tables + `current_user` into local DB (`seedConfiguration` + `mapConfiguration`). Verified against real payload.
- [x] `useRole()` — derives role from `roles` array + assignment mode from DB (reactive via `useLiveQuery`).
- [x] Route guards + protected `(app)` layout; `useLogout` (server logout + clear DB); placeholder home screen.

**Offline core — the point of this milestone** (US-051 · AC: Offline-First)
- [x] `syncEngine` — pull side (`pullJobs` reconcile, `pullJobDetail` hydrate, `sync_meta`) +
  flush-then-pull on every foreground sync (`useSyncJobs`).
- [x] `useConnectivity()` (expo-network) + `OfflineBanner` with "last synced X ago".
- [x] Outbox table + `outboxFlusher` (pending/in_progress/failed; permanent (4xx / 200+success:false)→failed
  no retry; transient (5xx/network)→pending retry to MAX_RETRY_ATTEMPTS — spec §11.5). `isPermanentFailure` tested.
- [x] Conflict resolution — server-wins **by construction** (no standalone module): the pull's
  `replaceJobs` overwrites local rows with server state; failed outbox items surfaced on job card +
  detail (retry/discard). _(Notify-on-silent-overwrite refinement deferred.)_
- [x] Optimistic local write on status update; reconciled by flush-then-pull.

**Vertical slice UI**
- [x] `useJobs()` reactive query (Drizzle `useLiveQuery`) → `JobList`/`JobCard` (+ `JobStatusBadge`, `EmptyState`).
- [x] `useJobDetail(id)` → Job detail (customer, stops, pricing, payment); per-job hydration.
- [x] Status update flow: `StatusPicker` + confirm dialog → optimistic write → outbox → flush (US-017).
- [x] **Exit test:** offline list renders from DB; status change queues offline and syncs on reconnect (logic complete; on-device run pending — no emulator here).

## Milestone 2 — Driver  (code complete; passes tsc · eslint · 51 unit tests — on-device run pending)

Centralized (US-010, US-013–US-017 · AC: Driver–Centralized)
- [x] Job list (centralized driver sees the server-returned list; dispatcher sees all). Full Job
  detail: Header (ref/status), Route, Customer, Pricing, Status (spec §6.5). _Server-side
  per-driver filtering still unconfirmed — see Open Questions._
- [x] `StopList` (ordered stops, visit type, scheduled time, tap-to-open-in-Maps); native-maps
  deep link via `utils/links.ts` (`mapsDirectionsUrl`, unit-tested) — route-level + per-stop (US-014, US-015).
- [x] Pricing breakdown (basic/distance/time/surcharge/tax/total) with currency + tax label from
  config (`formatCurrency`); status picker → `update_job_status`.
- [~] **RouteMap (embedded react-native-maps) — DEFERRED.** Shipped the "Open in Maps" deep-link
  instead (no native dep, works offline). Embedded map needs a native rebuild + on-device verify,
  blocked by the emulator (see M5). Do when the emulator is unblocked. (US-014.)
- [ ] **Per-stop contact name/phone (US-016) — NOT in the API.** The live stop payload has address +
  visit type + date only; no per-stop contact. Customer-level phone/email tap-to-call/email shipped
  instead. Revisit if the server adds per-stop contacts.

Decentralized (US-011, US-012, US-019 · AC: Driver–Decentralized)
- [x] Available / My Jobs tabs (`useJobs(scope, driverId)` → `availableJobsQuery`/`myJobsQuery`).
- [x] Claim job (assign to self) → `update_assigned` through the outbox (optimistic → flush-then-pull).
- [x] Assign within `can_assign_to` (`useAssignableDrivers` + `DriverPicker`); server 4xx/`success:false`
  surfaces as a failed outbox item on the job (retry/discard). _Happy path needs a live run — see below._

## Milestone 3 — Dispatcher  (code complete; passes tsc · eslint · 60 unit tests — on-device run pending)

(US-030–US-036 · AC: Dispatcher)
- [x] All-jobs list (dispatcher sees every job); assigned-driver shown per card (`showDriver`).
- [x] Bottom toolbar (filter + refresh + active-filter badge via `countActiveFilters`).
- [x] Filter sheet (`JobFilterSheet`): status multi-select chips, scheduled-date range, driver
  single-select (dispatcher only); applied client-side over the local DB (`applyJobFilters`,
  unit-tested). Persisted locally in AsyncStorage (`useJobFilters`) so last-used restores next launch.
- [x] Driver assignment/reassign from job detail → `update_assigned` (`useAssignableDrivers` now
  returns the full list for dispatchers; reuses the M2 outbox path + `DriverPicker`). _Live happy
  path still unverified — see Open Questions._
- [x] Drivers list (`DriverCard`, availability + assigned-job count via `useDriverJobCounts`) +
  detail (contact tap-to-call/email, can-assign-to, their assigned-jobs list). Dispatcher-only route guard.
- [x] Customers list (search name/email/phone — `filterCustomers`, unit-tested) + detail (contact,
  job history from local jobs). New `customers` table + migration `0001_lush_lifeguard`; `pullCustomers`
  added to the sync engine. Dispatcher-only route guard.

> **Date pickers:** the filter sheet takes the date range as typed `YYYY-MM-DD` fields (no native
> calendar widget) to avoid adding a date-picker native dep before the emulator is unblocked. A
> calendar UI is a polish follow-up. **Address/city:** customer detail shows contact + job history;
> the spec's "full address" isn't in the `/customers` wire shape (only on job-detail stops).

## Milestone 4 — Notifications & polish  (code complete; passes tsc · eslint · unit tests — on-device run pending)

(US-018, US-037, US-038)
- [x] Polling-based local notification **detection**: `detectJobChanges` diffs the previous local
  snapshot vs the freshly pulled jobs (new assignment to me / my-job status change / new-job for
  dispatch) — pure + unit-tested; wired into `pullJobs` via `getAllJobs` + `getCurrentUserRow`
  (spec §10 Option B).
- [~] **Native notification firing — DEFERRED.** `expo-notifications` is a native module needing a
  dev-client rebuild + on-device verify, blocked by the emulator (same stance as the M2 map). The
  presentation seam (`services/notifications/notifier.ts`) is in place and called by the sync; today
  it records intent in an in-memory log. Swap the no-op for `Notifications.scheduleNotificationAsync`
  once the emulator is unblocked. (US-018/037/038.)
- [x] Sync-status UI: `SyncStatusIndicator` (syncing spinner + outbox pending/failed count badges,
  spec §11.9) in the jobs header; global `isSyncing` flag in `connectivityStore`. Failed-item
  retry/discard already lands on the job card + detail (M1).
- [x] Multi-site: keyed configs already in secure-store; `listSites`/`switchSite` added to
  `authStore`, `useSites` hook (switch clears local DB then re-points the session), switcher +
  prominent active-site header in Profile (§12).
- [x] Profile/Settings screen (replaces the placeholder home): user (name/role/mode), driver details
  (phone/email/availability), active site + switcher, logout (→ `rest_logout` + clear DB) with confirm.

## Milestone 5 — Hardening & release

- [ ] Route-level error boundaries (CLAUDE.md).
- [~] Maestro E2E: login · job list · status update · offline mode (scaffold + smoke flow done;
  on-emulator run pending — see `docs/SMOKE_TESTING.md`). _Supersedes Detox._
- [ ] Performance: zero-network-latency launch (AC: Performance); first-sync progress + cancel.
- [ ] EAS builds: iOS preview (.ipa), Android apk; store listing assets.

---

## Deferred — out of scope for v1 (spec §14)

Driver availability toggle · create job · photo PoD · live GPS · per-stop status (AJAX only) ·
driver messaging · invoicing · earnings/reporting. If asked, refer back here.
