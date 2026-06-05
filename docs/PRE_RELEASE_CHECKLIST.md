# Pre-Release Checklist

Living checklist of things to verify before cutting a release. Grounded in actual code/test
observations, not generic advice. Tick items as they're confirmed; add new ones per change set.

Last reviewed: **2026-06-05** — full E2E pass against the **hardened** server
(`tq-pro-teams-php8`) ahead of the suite release. See "Server-hardening pass" below.

---

## Fresh full-feature E2E — 2026-06-05 (after server-team permissions fix)

Server team fixed the role registration. Re-verified from a **factory-wiped** emulator + reinstall:

- [x] Server permissions fix confirmed: roles registered with lowercase slugs `driver`/`dispatch`;
  driver login → roles `['driver']`, config/jobs **200**, customers **403** (correct); dispatch all 200.
  Token rejection still **403 `oauth2.*`** (app's fix handles it). See [[tqapp-driver-role-server]].
- [x] Test suite reset clean (`jest --clearCache`): **84 suites / 481 tests**; `tsc` clean; `eslint` 0 errors.
- [x] **Every feature driven on a fresh wipe** (all server calls confirmed in nginx as `okhttp/4.9.2`):
  onboarding from scratch (site URL + OAuth creds) · notifications permission · dispatch 2-step OAuth
  login · jobs list + **status filter** · job detail (route/stops/customer) · **driver assignment**
  (`update_assigned` form-encoded → 200) · **customers** list + search + detail (job history) ·
  **drivers** list + detail (assigned jobs) · **offline mode full cycle** (offline banner → local-DB
  render → optimistic write **+ outbox queue, no server call** → "1 pending" badge + per-card "Pending
  sync" → reconnect → **auto-flush 200** → pending cleared) · logout (`rest_logout` form-encoded → 200) ·
  driver login → **role-restricted UI** (Profile tab only, no Drivers/Customers) + **server-side job
  filtering** (driver sees only their assigned job, not all 41).
- [x] Test-site data restored (job 38 → New/unassigned, job 115 → Assigned).

No app issues found in this pass. The 403-auth fix (below) remains the one app change to ship.

---

## Server-hardening pass — 2026-06-05 (findings + actions)

Full live re-test of the app against the hardened API. Every endpoint the app calls was probed
with all three role tokens; both roles were driven end-to-end on the emulator (login → sync →
detail → status write → logout → re-login), all returning 200 via the adb-reverse tunnel.

**FIXED (app) — auth token rejection is now 403, not 401.** A hardened invalid/expired/revoked
token returns **403** `oauth2.authentication.attempt_authentication.invalid_token` (only a *missing*
Authorization header is 401). The `apiClient` interceptor only cleared the session on 401, so an
expired token would have left the user stuck on authed screens with silently-failing calls and no
redirect to login. Fix: `services/apiError.ts` `isTokenRejected()`; `apiClient` clears the session
on 401 **or** a token-rejected 403; `rest_forbidden` (permission denial) does NOT log out;
`isPermanentFailure` keeps a token-expiry-mid-write retryable. +6 unit tests, all green.

- [x] `tsc --noEmit` clean · `eslint` clean · `jest` **84 suites / 481 tests** pass
- [x] Dispatch E2E live: 2-step OAuth login, configuration + jobs + detail-hydration sync, job
  detail, **status update write (committed server-side, confirmed across a re-login)**, logout, re-login
- [x] Driver E2E live: login now 200 (see role blocker below), read-only job list with **no**
  dispatcher-only Drivers/Customers tabs (role-based access correct)
- [x] Logout fix (form-encoded `access_token`, already in tree) confirmed live → `rest_logout` 200 → login
- [x] `update_assigned` JSON-integer→HTTP-500 server bug is now FIXED server-side; app still sends
  form-encoded (works). The "server crashes on JSON" comment in `services/api/jobs.ts` is now stale.
- [x] Test-site data restored after E2E (job 115 reverted In Progress → Assigned)

**RELEASE BLOCKER (server, NOT app) — verify the `Driver` WP role is registered on every tenant.**
REST `check_access` authorizes by `$current_user->roles` (must contain driver/dispatch/administrator),
NOT by capability. On the test site the `Driver` role was **missing** after hardening (user had cap
`{Driver:true}` but no registered role → `roles: []` → **403 on every endpoint**; the whole driver app
was dead). Restored on the test site (`ddev wp role create Driver Driver`). **Confirm plugin
activate/update registers `Driver` + `Dispatch` on all production tenant sites before release.**
Also: ~80 junk `TestRole*`/`RefreshTest*` roles from un-cleaned E2E runs pollute the test site; and
`api-driver` (wp 284) isn't linked to a driver row, so Centralized `GET /jobs` is unfiltered for it.

---

## Status at last review — no blockers

The offline bulk-detail-hydration feature is verified at every level and is ship-able as-is:

- [x] `tsc --noEmit` clean
- [x] `eslint` clean
- [x] `jest` — 84 suites / 475 tests pass
- [x] All **9** Maestro flows green on `Pixel_9` (incl. new `offline-detail.yaml`) — see `docs/SMOKE_TESTING.md`
- [x] Migration `0005_living_kingpin` is additive + nullable (self-heals on existing installs)

---

## Verify before release — real gaps (NOT covered by today's tests)

- [ ] **Large-tenant first sync.** The `api-driver` test site has only a handful of jobs. On a tenant
  with hundreds/thousands, the first sync fires one `GET /jobs?id=` per job at concurrency 5,
  **uncapped** (`MAX_DETAIL_HYDRATION = 0` in `constants/index.ts`). The API has no rate limiting so
  it completes, but it's a real burst of requests + battery/data on first launch.
  → Test against a large dataset, or set a sane default cap. Assigned-first ordering
  (`getJobsNeedingDetail`) already front-loads the useful jobs, so a cap degrades gracefully.
- [ ] **Upgrade re-hydration burst.** Existing installs get `job_modified_at = NULL` on every
  already-hydrated `job_details` row → all flagged stale → a one-time **full re-hydration** on the
  first post-update online sync. Correct and self-healing, but the same burst concern applied to the
  existing user base. Confirm it's acceptable / expected (so it doesn't read as a bug in telemetry).
- [ ] **Notification-tap / cold deep-link to a job.** `pullJobDetail` no longer creates the `jobs`
  row (detail-only write). Normal path is safe (the list pull populates the row first). The soft spot
  is a deep-link to a job id never seen in a list pull → "Job not found" + a harmless orphan
  `job_details` row (FK enforcement is OFF on the device DB, so it can't crash — it writes an orphan).
  → Manually confirm tapping a job push-notification (Option B) lands on a populated detail screen.

## Known limitations to note (behaviour, not fixes)

- [ ] **Optimistically-modified jobs re-hydrate once per cycle.** `applyOptimisticStatus/Assignment`
  bump `jobs.modified` to "now", so until the next list pull reconciles it back to the server value,
  that job looks "stale" and its detail re-fetches once. Minor wasted fetch, self-heals — acceptable,
  but it slightly undercuts the "zero requests in steady state" property while a write is pending.
- [ ] **No background sync exists app-wide.** There is no `expo-background-fetch` wiring
  (`registerTaskAsync`/`defineTask`) anywhere, despite CLAUDE.md mentioning it. Detail hydration runs
  only on **foreground** sync, consistent with the rest of the app. If background sync is a release
  requirement, it's a separate piece of work (and detail hydration would need wiring into it).

## Repo hygiene

- [ ] **Pre-existing uncommitted changes** — `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`
  were modified/untracked before the bulk-hydration session and were deliberately kept out of the
  feature commit. Review and commit (or discard) so the release tag comes from a clean tree.
- [ ] **Test-site state drifted** — the `smoke` / `offline` / `assign-driver` E2E flows mutate live
  data (status changes + one assignment) on `tq-pro-teams-php8`. Reset it if any release sign-off
  reads that site.

## Deferred / out of scope (tracked elsewhere — not release gates)

- Notify-on-silent-overwrite (deferred in `BACKLOG.md`).
- Bulk prefetch of **customer** / driver detail (separate concern; proposal "Out of scope").
- Items in `docs/SMOKE_TESTING.md` "E2E coverage gaps" (outbox failed→retry/discard, etc.) — covered
  at unit/integration level; not auto-testable from Maestro + the live site alone.
