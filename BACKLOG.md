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
- [ ] **Write endpoint shapes.** `update_job_status` / `update_assigned` request+response not yet
  exercised (they mutate test data). Verify before building the outbox flusher. _(US-017, US-019.)_

---

## Milestone 0 — Foundation  (mostly done)

- [x] Reconcile docs to real stack; pick DB engine (ADR-001).
- [x] Install core libs + tooling (ESLint, Jest, EAS); verify typecheck/lint/test green.
- [x] Scaffold `constants/` + `utils/` with first passing unit test.
- [x] **Node version** — on v24.16.0 (satisfies RN 0.85's `^24.3.0`); no `EBADENGINE` warnings.
- [x] Obtain staging API credentials — live test site + OAuth2 creds in hand; round-trip verified.
- [x] Capture real API payloads; correct `types/api.ts` + API docs to verified wire shapes (`docs/API_NOTES.md`).
- [ ] Define Drizzle schema (`database/schema.ts`) mirroring spec §11.2 exactly; generate first migration.
- [ ] `database/client.ts` — expo-sqlite connection + drizzle instance + migration runner on boot.

## Milestone 1 — Walking skeleton

**Auth & bootstrap** (US-001, US-002, US-004 · AC: Authentication)
- [ ] `services/api/auth.ts` — `POST /rest_login`, `POST /rest_logout`.
- [ ] `services/apiClient.ts` — axios instance, base URL from `authStore.siteUrl`, Bearer
  interceptor, 401 → clear token + redirect (CLAUDE.md API rules).
- [ ] `authStore` — token + site config in **expo-secure-store**; persists across restart.
- [ ] Onboarding screen — site URL + client_id/secret, validate via `/rest_login`.
- [ ] Login screen — real form, error surfacing from API `message`, role-based home redirect.
- [ ] `GET /configuration` → seed reference tables + `current_user` into local DB.
- [ ] `useRole()` — derive role from `roles` array (not display strings).

**Offline core — the point of this milestone** (US-051 · AC: Offline-First)
- [ ] Outbox table + `outboxFlusher` (pending/in_progress/failed/synced; 4xx→failed no retry,
  5xx/network→pending retry — spec §11.5).
- [ ] `conflictResolver` — server-wins + notify (spec §11.6).
- [ ] `syncEngine` — initial full sync, foreground sync, on-reconnect flush-then-pull (§11.4).
- [ ] `useConnectivity()` (expo-network) + `OfflineBanner` with "last synced X ago".
- [ ] Optimistic local write on status update; reconcile on sync.

**Vertical slice UI**
- [ ] `useJobs()` reactive query (Drizzle `useLiveQuery`) → minimal `JobList`/`JobCard`.
- [ ] `useJobDetail(id)` → minimal Job detail.
- [ ] Status update flow with confirm dialog → outbox → optimistic UI (US-017).
- [ ] **Exit test:** offline list renders; status change queues and syncs on reconnect.

## Milestone 2 — Driver

Centralized (US-010, US-013–US-017 · AC: Driver–Centralized)
- [ ] Server-filtered job list; full Job detail (Header/Route/Customer/Pricing/Status — spec §6.5).
- [ ] StopList with contact name/phone; RouteMap (react-native-maps); native-maps deep link (US-014, US-015).
- [ ] Pricing breakdown with currency from config; status picker → `update_job_status`.

Decentralized (US-011, US-012, US-019 · AC: Driver–Decentralized)
- [ ] Available / My Jobs tabs; claim job → `update_assigned`.
- [ ] Assign within `can_assign_to`; surface server 4xx rejection. _Depends on open question._

## Milestone 3 — Dispatcher

(US-030–US-036 · AC: Dispatcher)
- [ ] All-jobs list (no role filter); assigned-driver shown per card.
- [ ] Bottom toolbar (filter + refresh + active-filter badge).
- [ ] Filter sheet: status multi-select, date range, driver single-select; persist filters locally (§6.4).
- [ ] Driver assignment from job detail (assign/reassign) → `update_assigned`.
- [ ] Drivers list + detail (assigned active jobs count, their job list).
- [ ] Customers list (search name/email/phone) + detail (address, contact, job history).

## Milestone 4 — Notifications & polish

(US-018, US-037, US-038)
- [ ] Polling-based local notifications: diff incoming sync vs local DB → `expo-notifications`
  for new assignment / status change (spec §10 Option B).
- [ ] Full sync-status UI: syncing spinner, outbox count badge, failed-item warning + retry/discard (§11.9).
- [ ] Multi-site: keyed configs in secure-store, switch from Profile, active-site header (§12).
- [ ] Profile/Settings screen (user, driver details, site URL, logout → `rest_logout` + clear DB).

## Milestone 5 — Hardening & release

- [ ] Route-level error boundaries (CLAUDE.md).
- [ ] Detox E2E: login · job list · status update · offline mode.
- [ ] Performance: zero-network-latency launch (AC: Performance); first-sync progress + cancel.
- [ ] EAS builds: iOS preview (.ipa), Android apk; store listing assets.

---

## Deferred — out of scope for v1 (spec §14)

Driver availability toggle · create job · photo PoD · live GPS · per-stop status (AJAX only) ·
driver messaging · invoicing · earnings/reporting. If asked, refer back here.
