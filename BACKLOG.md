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
- [x] **Decentralized assignment happy path.** **Verified live 2026-06-01** — after the server fixed
  the `update_assigned` 500 (PHP 8 `urldecode()` on int fields in the job formatter; see
  [`docs/API_NOTES.md`](./docs/API_NOTES.md) §10), an `id=7&driver_id=432` assignment returned
  **HTTP 200 / `success: true`** and the app's queued outbox item flushed cleanly. _(US-012, US-019.)_

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
- [x] Onboarding screen — per-company site URL + client_id/secret → `saveSiteConfig` (`useOnboarding`).
  _(Multi-tenant entry point: each customer enters their own WordPress URL on first run. URL
  reachability validation is a HIGH-priority hardening follow-up — see Open Questions.)_
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
- [x] **RouteMap (embedded react-native-maps) — REMOVED FROM SCOPE (2026-06-01).** The "Open in
  Maps" deep-link (route-level + per-stop, no native dep, works offline) is the final solution for
  US-014/US-015. The embedded map will **not** be built — it adds a native dependency + per-tenant
  Google Maps API-key management for no gain over the external link. Spec updated (§6.5B, §14).
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
- [x] **Bug — dispatcher route guard redirected on first render (fixed 2026-06-01).** Drivers &
  Customers `index` + `[id]` screens did `if (!isDispatcher) return <Redirect href="/jobs" />`, but
  `useRole()` derives the role from a Drizzle `useLiveQuery` that returns **empty on first render** —
  so on mount `role` was momentarily `null` → `isDispatcher` false → the screen bounced straight back
  to `/jobs`, making **Drivers/Customers unreachable for dispatchers** (the header links appeared but
  did nothing). Fixed by guarding on `role !== null && !isDispatcher` (don't redirect while the role
  query is still hydrating) across all four screens; aligns with the "handle loading explicitly" rule.
  Found via the new-theme screenshot tour (`.maestro/screens-dispatch.yaml`). Regression tests added
  (`app/(app)/{drivers,customers}/__tests__/index.test.tsx`): role-loading window does not redirect;
  loaded driver does; dispatcher renders — verified red against the old guard. _(US-030, US-035.)_

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
- [x] **Native notification firing.** `expo-notifications` 56.0.15 added (expo-doctor 21/21, New-Arch
  OK). `services/notifications/setup.ts` owns the foreground handler + `job-updates` Android channel +
  permission flow (not-asked|denied|granted); `notifier.ts` fires via `scheduleNotificationAsync`
  (channel-aware trigger) only when granted, still logging intent in-memory otherwise. First/baseline
  sync suppressed in `pullJobs` (else 41 jobs → 41-notification storm). Wired into boot (`useAppBoot`).
  **Verified on emulator end-to-end:** permission prompt → grant → channel created → no storm on login →
  an out-of-band status change fired exactly one "Job status updated / Job … is now Assigned."
  notification. 4 unit tests (granted/denied/error/log). (US-018/037/038.)
- [x] Sync-status UI: `SyncStatusIndicator` (syncing spinner + outbox pending/failed count badges,
  spec §11.9) in the jobs header; global `isSyncing` flag in `connectivityStore`. Failed-item
  retry/discard already lands on the job card + detail (M1).
- [x] Multi-site: keyed configs already in secure-store; `listSites`/`switchSite` added to
  `authStore`, `useSites` hook (switch clears local DB then re-points the session), switcher +
  prominent active-site header in Profile (§12).
- [x] Profile/Settings screen (replaces the placeholder home): user (name/role/mode), driver details
  (phone/email/availability), active site + switcher, logout (→ `rest_logout` + clear DB) with confirm.

## Milestone 5 — Hardening & release

- [x] Route-level error boundaries (CLAUDE.md). `RouteErrorBoundary` (functional — uses Expo
  Router's `ErrorBoundary` export convention, so no class component) re-exported from the root,
  `(app)`, and `(auth)` layouts. Safe-area-aware fallback with the thrown message + retry. First
  RTL component test in the repo (`components/shared/__tests__/RouteErrorBoundary.test.tsx`).
- [x] Maestro E2E: login · job list · status update · offline mode — **all flows green on the
  emulator** (`minimal`, `smoke`, `offline`, steps 01–05). Re-verified 2026-06-01 after the M5 route
  changes. _Supersedes Detox._ See `docs/SMOKE_TESTING.md`.
- [x] Performance: **zero-network-latency launch verified on device** (offline cold launch renders the
  jobs list instantly from the local DB — no spinner, no network wait). First-sync **progress + cancel**:
  `FirstSyncProgress` overlay (shown only while the DB is empty + the initial pull is in flight) with a
  Cancel that aborts the request via `AbortSignal` (plumbed `getJobs`→`pullJobs`→`useSyncJobs`); a
  user-cancel is swallowed (`axios.isCancel`) so it never surfaces as a sync error. RTL-tested.
- [~] EAS builds. `eas.json` finalized: **preview** → Android `apk` + iOS device `.ipa` (ad-hoc,
  internal); **production** → Android `app-bundle` (.aab). Store assets (icon/adaptive/splash/favicon)
  present in `assets/`. **Local release pipeline verified** — `assembleRelease` produces a signed,
  Hermes-bundled, minified release APK that installs and launches on the emulator. **Remaining (NOT
  emulator-blocked — needs accounts):** the actual EAS *cloud* builds require an interactive
  `eas login` + `eas init` (writes `projectId`) and, for iOS, Apple Developer credentials. Run:
  `eas build -p android --profile preview` / `eas build -p ios --profile preview`.
- [ ] **Harden `parseApiBody` against injected error/warning noise.** `services/parseApiBody.ts`
  strips noise by slicing from the **first `{`/`[`** — fragile: it assumes the first bracket begins
  the JSON envelope. On 2026-06-02 the `GET /jobs?id=` endpoint regressed (PHP `$journey_order`
  deprecation **+** a `wpdberror` SQL block, "Unknown column …quote_surcharges.quote_surcharges.id"),
  and because the SQL error text contains `[Unknown column …]`, `parseApiBody` sliced at that `[`
  and `JSON.parse` threw → **every job detail rendered empty** (no Route/Customer/Pricing/Payment),
  silently (no user-visible error). Fixed server-side (verified live 2026-06-02) — but the client
  guard should be robust regardless: locate the `{"data"`/`{"code"` envelope (or the first `{` that
  parses to end-of-string), and/or strip known WP error/deprecation HTML blocks first. Add a
  regression test using the exact broken payload. _(Defence-in-depth; the server has regressed PHP
  warnings into REST JSON more than once — see `docs/API_NOTES.md` §5.)_
- [ ] **Reconcile the "warning-strip is a no-op" claim in the docs.** `docs/API_NOTES.md` §5 and the
  `CLAUDE.md` API Layer note state the PHP-warning prefix was fixed 2026-06-01 and the strip "is now
  a no-op." That was **false for the `/jobs?id=` path**, which still emitted a deprecation + SQL error
  until the 2026-06-02 server fix. Add a one-line note that the detail endpoint regressed and was
  re-fixed 2026-06-02, so the assumption that "the body is always clean JSON" stays honest. Pairs with
  the `parseApiBody` hardening above.

---

## Deferred — out of scope for v1 (spec §14)

Driver availability toggle · create job · photo PoD · live GPS · per-stop status (AJAX only) ·
driver messaging · invoicing · earnings/reporting. If asked, refer back here.
