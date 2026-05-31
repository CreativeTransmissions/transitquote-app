# Project Status — 2026-05-31

Snapshot of where TransitTeam Mobile stands. Living docs: [`ROADMAP.md`](../ROADMAP.md) (milestones),
[`BACKLOG.md`](../BACKLOG.md) (task list), [`docs/`](.) (decisions & guides).

---

## Milestone status

| Milestone | State | Notes |
|---|---|---|
| **M0 — Foundation & de-risking** | ✅ Done | Stack reconciled, DB engine chosen (ADR-001), tooling green, live API access + creds obtained, all open questions resolved. |
| **M1 — Walking skeleton** | ✅ Code complete | Full vertical slice built & unit-tested. **Not yet run on a device end-to-end** (see Maestro blocker). |
| **M2 — Driver experience** | ✅ Code complete | Centralized list/detail; decentralized Available/My-Jobs tabs + claim/assign; status update; tap-to-call/email; "Open in Maps" deep-link. **Embedded route map deferred** (native dep, see M5); per-stop contact not in API. On-device run pending. |
| **M3 — Dispatcher experience** | ✅ Code complete | All-jobs list + bottom toolbar; filter sheet (status/date/driver, persisted); assign/reassign from detail; drivers list/detail (job counts); customers list (search)/detail (job history). Date entry is typed fields (no native picker); customer "full address" not in API. On-device run pending. |
| **M4 — Notifications & polish** | ✅ Code complete | Notification **detection** engine (diff sync vs DB) wired into sync; sync-status indicator (spinner + pending/failed badges); multi-site switching + Profile/Settings screen. **Native notification firing deferred** (expo-notifications native dep, blocked by emulator). On-device run pending. |
| **M5 — Hardening & release** | 🟡 Partial | Maestro E2E scaffolded (below); error boundaries, perf, EAS builds outstanding. |

---

## What works (verified)

**App (M1–M3) — passes `tsc` · `eslint` · 60 unit tests:**
- Two-step OAuth login (`rest_login` → `oauth2/access_token`), token in `expo-secure-store`.
- Onboarding (site URL + client creds) → login → `/configuration` seeds the local SQLite DB → role-based routing.
- Offline-first job list + detail: UI reads from SQLite via `useLiveQuery`; background sync (pull + per-job detail hydration) keeps it fresh.
- Optimistic status updates through an outbox (queue offline → flush-then-pull on reconnect; 4xx/`success:false` → failed-no-retry, 5xx/network → retry).
- API layer validated against the **live DDEV API** (real payloads; write endpoints probed reversibly — see [`API_NOTES.md`](./API_NOTES.md) §10).

**Driver experience (M2):**
- Decentralized **Available / My Jobs** tabs (DB-filtered: unassigned vs assigned-to-me); centralized/dispatcher single list.
- **Claim** (assign-to-self) and **Assign driver** (filtered to `can_assign_to` via `DriverPicker`) — optimistic write through the outbox, server rejection surfaces as a failed item with retry/discard.
- Job detail: ordered **StopList**, **"Open in Maps"** deep-link (route + per-stop), tap-to-call/email customer, currency-formatted pricing breakdown, status picker.
- **Deferred by choice:** embedded react-native-maps (native dep + on-device verify, blocked by emulator). **Not in API:** per-stop contact name/phone (US-016).

**Dispatcher experience (M3):**
- All-jobs list with a **bottom toolbar** (filter + refresh) and an **active-filter badge**.
- **Filter sheet**: status multi-select, scheduled-date range, driver (dispatcher only) — applied client-side over the local DB and **persisted** in AsyncStorage (last-used restored on launch).
- **Assign/reassign** any job to any driver from job detail (reuses the M2 outbox + `DriverPicker`).
- **Drivers** list (availability + assigned-job count) and detail (contact, can-assign-to, their jobs).
- **Customers** list (search name/email/phone) and detail (contact + job history). New `customers` table + migration `0001`, `pullCustomers` in the sync engine. All dispatcher-only routes guarded.
- **Deferred/again:** typed `YYYY-MM-DD` date fields (no native calendar dep yet); customer "full address" isn't in the `/customers` API.

**Notifications & polish (M4):**
- Polling-based local notification **detection** (`detectJobChanges`, unit-tested): diffs the prior local snapshot vs freshly pulled jobs for new-assignment / status-change / new-job, wired into `pullJobs`.
- **Sync-status indicator** in the jobs header (syncing spinner + outbox pending/failed count badges, §11.9).
- **Multi-site switching**: `listSites`/`switchSite` + `useSites` (switch clears the local DB, re-points the session); switcher + prominent active-site header in the new Profile/Settings screen.
- **Profile/Settings** screen: user, driver details, active site, site switcher, confirmed logout.
- **Deferred by choice:** native `expo-notifications` firing (native dep + on-device verify, blocked by emulator) — detection + a presentation seam are in place; one-function swap when unblocked.

**Maestro E2E (M5 scaffold):**
- Maestro **2.6.0** installed natively on Windows; runner topology decided (native Windows, no WSL — see [`SMOKE_TESTING.md`](./SMOKE_TESTING.md)).
- Flows authored: `smoke.yaml` (onboarding→login→jobs→detail→status update), `offline.yaml` (offline-first promise), shared `subflows/auth.yaml`. `testID`-driven; secrets via env vars.
- Build toolchain unblocked: **Avast antivirus HTTPS interception** broke Gradle/SDK downloads (`PKIX path building failed`); fixed by importing Avast's root CA into a writable JDK truststore (`~/.tqapp-certs/cacerts` + `JAVA_TOOL_OPTIONS`). TLS to Gradle verified (200).
- App **built & installed** on the emulator (`BUILD SUCCESSFUL`; `pm list packages` → `com.transitteam.app`); Metro bundles.

---

## Blockers / open items

1. **🔴 Maestro E2E not yet green (one blocker).** The app is installed, but the `Pixel_9` AVD is a
   **non-rootable Play-store image**, so `/system/etc/hosts` can't be edited. The emulator resolves the
   DDEV hostname to `127.0.0.1` (needs `10.0.2.2`), and DDEV strictly requires the correct Host header
   (verified: wrong host → 404). **Fix:** create a **rootable AVD** (`google_apis` image) — requires
   installing Android `cmdline-tools` + a ~1.5 GB system image first, then boot `-writable-system`, edit
   hosts, run flows over `http://`. Full recipe in [`SMOKE_TESTING.md`](./SMOKE_TESTING.md). _Deferred by choice._

2. **🟡 `update_assigned` server bugs (reported, not ours).** JSON body crashes the server (needs
   form-encoding); `driver_id` must be a `drivers.id`; happy path unconfirmed (only test driver is
   unavailable). See [`API_NOTES.md`](./API_NOTES.md) §10. Affects decentralized assignment (US-019).

3. **🟡 Centralized server-side job filtering unconfirmed.** Driver & dispatch `/jobs` returned identical
   lists; verify whether the server filters by driver or the client must. (BACKLOG open item.)

4. **🟡 Driver user with no driver record.** The `api-driver` test user's `wp_user_id` isn't in the
   drivers list, so derived `current_user.driver_id` is null — decide the "My Jobs" fallback. (BACKLOG.)

5. **🟢 Local-dev TLS (mkcert + Avast).** Worked around for builds (truststore) and for E2E (use `http://`).
   An HTTPS E2E run would need the mkcert CA bundled via a debug-only `networkSecurityConfig`.

---

## Environment notes (this machine)

- **Maestro 2.6.0** at `C:\maestro`; **JDK 17** (Adoptium); emulator AVD `Pixel_9` (API 37, non-rootable).
- **Avast antivirus** MITMs HTTPS — needs `curl --ssl-no-revoke` for GitHub and the JDK truststore patch
  for Gradle/SDK. Patched truststore at `C:\Users\<you>\.tqapp-certs\cacerts` (set via `JAVA_TOOL_OPTIONS`).
- `certs/` and `.api-samples/` are gitignored (contain a local CA / live secrets).

---

## Suggested next steps

- **Finish E2E / unblock the emulator (now the critical path):** build the rootable AVD per `SMOKE_TESTING.md` for the first green smoke + offline run. Unblocking this also clears the deferred native work (notification firing, embedded map, native date picker) and lets the unconfirmed live paths (centralized `/jobs` filtering, `update_assigned` happy path) be verified.
- **Or start M5 hardening:** route-level error boundaries, performance pass, EAS builds (iOS preview / Android apk) — mostly emulator-independent.
- **Follow-ups:** bundle JS in a release APK so E2E doesn't need Metro; wire `expo-notifications` into the notifier seam; swap typed date fields for a native picker; add the embedded route map.
