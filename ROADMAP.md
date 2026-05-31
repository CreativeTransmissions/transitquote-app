# TransitTeam Mobile — Roadmap

Phased delivery plan. The guiding principle: **de-risk the hard architecture (offline sync)
with a thin end-to-end slice before fanning out screens.** Detailed, checkable tasks live in
[`BACKLOG.md`](./BACKLOG.md); this file is the milestone view and the "why" of the sequence.

Source of truth for scope = [`MOBILE_APP_REQUIREMENTS.md`](./MOBILE_APP_REQUIREMENTS.md).
Architecture rules = [`CLAUDE.md`](./CLAUDE.md). Key decisions = [`docs/`](./docs).

---

## Definition of Done (every feature must meet this)

A task is not "done" until:

- [ ] Reads from the **local DB**, never the API, to render (offline-first).
- [ ] Handles all four states explicitly: **loading · empty · error · offline**.
- [ ] Permission/role states handled: a driver never sees dispatcher-only UI.
- [ ] **Safe-area insets** applied; no hardcoded dimensions; no inline styles.
- [ ] Business logic in a hook, not the component; no API/DB calls in components.
- [ ] TypeScript strict — no `any`, no unchecked optional access.
- [ ] Tests for the owning hook/util cover loading · success · error · offline.
- [ ] `npm run typecheck` + `npm run lint` + `npm test` all pass.
- [ ] Confirm dialog before any status update or assignment (prevent accidental taps).

---

## Milestone 0 — Foundation & de-risking  ·  _largely DONE_

Goal: a project where the architecture is decided and the toolchain runs green.

- [x] Reconcile docs to the real stack (Expo 56 / RN 0.85 / React 19).
- [x] Choose local DB engine — **expo-sqlite + Drizzle** ([ADR-001](./docs/DB_ENGINE_DECISION.md)).
- [x] Install core libs (sqlite, secure-store, network, linking, drizzle, dayjs, axios).
- [x] Tooling: ESLint (flat) · Jest (jest-expo) · EAS profiles · npm scripts. All verified.
- [x] Scaffold `constants/` + `utils/` (colours, spacing, typography, formatters, roleGuards).
- [x] **Node ≥ RN 0.85 requirement** — now on v24.16.0 (satisfies `^24.3.0`); no engine warnings.
- [x] Get a **staging site URL + OAuth2 credentials** — live test site in hand; round-trip verified, real payloads captured, `types/api.ts` + API docs corrected ([`docs/API_NOTES.md`](./docs/API_NOTES.md)).
- [x] Resolve the `can_assign_to` ambiguity — it's a driver-id string, not a boolean (all BACKLOG open questions now resolved).

## Milestone 1 — Walking skeleton (one vertical slice, end to end)

Goal: prove every architectural layer with the smallest possible feature. If this works,
the rest is repetition. **Build the sync engine here, not later.**

Onboarding → Login (secure-store token) → `GET /configuration` → seed local DB →
**Job list rendered from local DB** → Job detail → **one status update through the full
outbox round-trip** (optimistic write → queue → flush → reconcile → conflict notice).
Plus: connectivity detection + offline banner + "last synced" timestamp.

Exit criteria: kill the network mid-use — list still renders, a status change queues and
syncs on reconnect.

## Milestone 2 — Driver experience  ·  _code complete (on-device run pending)_

Centralized job list · job detail (stops, pricing, native-maps deep link) · status update picker.
Decentralized: Available/My Jobs tabs · claim job · assign within `can_assign_to`. Done bar one
deferral: the **embedded** route map (react-native-maps) is deferred to M5 in favour of an "Open in
Maps" deep-link — it needs a native rebuild + on-device verify, blocked by the emulator. Per-stop
contact (US-016) isn't in the API; customer-level tap-to-call/email shipped instead. See BACKLOG.

## Milestone 3 — Dispatcher experience  ·  _code complete (on-device run pending)_

All-jobs list · filter sheet (status multi-select, date range, driver) with persisted filters ·
bottom toolbar · driver assignment from detail · drivers list/detail · customers list/detail
(with search + job history). Two minor deferrals: typed date fields instead of a native calendar
picker, and customer "full address" (not in the `/customers` API). See BACKLOG.

## Milestone 4 — Notifications & polish  ·  _code complete (on-device run pending)_

Polling-based local notification **detection** (spec Option B — new assignment / status change
falls out of the sync cycle, pure + tested; native `expo-notifications` firing deferred behind a
seam, blocked by the emulator) · full sync-status UI (syncing spinner, outbox badge, failed-item
retry/discard) · multi-site switching in Profile.

## Milestone 5 — Hardening & release

Error boundaries at route level · Maestro E2E (login, list, status update, offline) ·
performance pass (zero-latency launch) · EAS builds (iOS preview, Android apk) · store assets.

---

## Sequencing rationale

1. **Sync is the risk, not the screens.** A status update that survives offline → reconnect →
   conflict touches secure-store, the DB, the outbox, connectivity, optimistic UI, and the API.
   Building it in M1 against one screen surfaces problems in week 2, not month 2.
2. **Driver before Dispatcher** — driver is the narrower role and exercises the read + write +
   offline paths fully; dispatcher mostly adds breadth (more lists, filters) on the same engine.
3. **Notifications last (of the features)** — Option B is a by-product of the sync cycle, so it
   costs little once M1–M3 exist, and needs no backend relay.
