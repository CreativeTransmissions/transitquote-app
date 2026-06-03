# Offline-first: bulk-hydrate & persist *all* job details on sync (not just visited jobs)

**Labels:** `enhancement`, `offline-first`, `sync`, `area:database`
**Milestone:** M1 hardening (Offline core) / pre-release
**Relates to:** `docs/SMOKE_TESTING.md` (offline E2E), spec §11 (sync), `BACKLOG.md` (M1 "Offline core")

---

## Problem

Job **detail** (route/stops, full customer block, pricing/quote, payment) is only ever fetched
**lazily, per job, when the user opens that job's detail screen** — and only while online. There is
**no bulk prefetch**. Consequence: a job the user has never opened has **no locally-stored detail**,
so opening it offline shows the flat card-level fields but is missing everything from the detail
endpoint.

This violates the core offline-first promise (CLAUDE.md: *"The UI ALWAYS reads from the local
SQLite database… Offline-first is not an enhancement — it is a core architectural requirement."*).
A field driver who loses signal can only see full detail for jobs they happened to open beforehand.

### Current behaviour (evidence)

- **List pull only.** `pullJobs()` calls `getJobs()` → `GET /…/jobs` (flat list), maps, `replaceJobs()`.
  The list carries **no nested data**. — `database/sync/syncEngine.ts:26-53`, confirmed `BACKLOG.md` ("list is flat").
- **Detail is per-job, lazy, online-gated.** `pullJobDetail(id)` (`syncEngine.ts:56-61`) is invoked
  from exactly one place: `useJobDetail` on mount / connectivity-restore, **gated on `isOnline`** —
  `hooks/useJobDetail.ts:30-32`. No other non-test caller exists.
- **No bulk hydration anywhere.** (verified: only `useJobDetail`, the API client, and the barrel
  reference `pullJobDetail`/`getJobDetail`.)
- **Persistence works once visited.** `upsertJobWithDetail` writes the blobs into `job_details`
  (`database/queries/jobs.ts:95-100`); `replaceJobs` keeps surviving jobs' detail rows across later
  list pulls and only prunes detail for jobs the server dropped (`queries/jobs.ts:40-61`). So the
  storage layer is fine — the gap is purely that we never *fetch* detail ahead of time.

### Latent reconciliation bug (fix in the same change)

`mapJobDetail` emits a job row that **includes `statusTypeId`** (`database/mappers.ts:63-80`), and
`upsertJobWithDetail` upserts that job row (`queries/jobs.ts:97`). So if a user queues a status
change **offline**, then comes online and opens that job, the per-job detail hydration overwrites
`jobs.status_type_id` with the server's **stale** value — visibly reverting the optimistic status
until the next *list* pull re-applies `reconcileOptimistic`. A bulk hydration over **all** jobs
would hit this for every job with a pending mutation. The detail path must **never** clobber
status/assignment that is reconciled by the list pull.

---

## Goal

> On sync: pull the list first, then pull **and persist the detail of every job**, with each job's
> **status/assignment reconciled** against both upstream (server) changes and any updates **queued in
> the outbox**. The user should have **as much functionality offline as possible** — opening *any*
> job offline shows full detail, not a stub.

### Acceptance criteria

1. After a completed sync while online, **every** job returned by the list has a persisted
   `job_details` row.
2. Opening **any** job **offline** renders full detail (route/stops, customer, pricing, payment)
   from the local DB — no "missing detail" state for jobs that existed at the last sync.
3. A job's displayed **status/assignment** equals the **optimistic local value** when an outbox
   `UPDATE_STATUS`/`ASSIGN_DRIVER` is pending/in-progress for it, otherwise the **server** value —
   and detail hydration **never** reverts a pending optimistic write.
4. Sync is **incremental**: a steady-state sync (nothing changed) issues **zero** detail requests;
   only **new** jobs and jobs whose `modified` advanced are (re)hydrated.
5. Detail hydration is **abortable** (Cancel on first-sync), **partial-failure-tolerant** (one
   job's detail 500 doesn't fail the whole sync; it's retried next sync), and **bounded** in
   concurrency.
6. The list screen still renders as soon as the **list** pull completes — detail hydration continues
   in the background and does not block first paint.
7. First-sync UX shows **determinate** progress for the detail phase ("Downloading job details…
   42/120"); refresh/background syncs surface it via the existing sync indicator.

---

## Proposed approach

Keep the architecture's separation (services → mappers → queries → sync) and the **single source of
truth** for status: the `jobs` row, reconciled in `pullJobs`. Detail hydration writes **only the
`job_details` blob** and never touches `jobs.status_type_id`/`driver_id`.

### 1. Sync sequence (`hooks/useSync.ts`)

Extend the existing flush-then-pull mutation to a three-phase pipeline:

```
flushOutbox()                  // push queued local writes first (unchanged)
await pullJobs(signal)         // list → reconciled jobs rows + notifications (unchanged)
await hydrateJobDetails(signal, onProgress)   // NEW: bulk detail, incremental, bounded, abortable
setLastSyncedAt(now)
```

- The list phase still establishes the baseline and fires notifications exactly as today.
- The detail phase runs **after** the list so it knows the full id set and each job's `modified`.
- Cancellation: the same `AbortController.signal` is threaded into `hydrateJobDetails`; a user cancel
  remains benign (caught via `isCancel`), leaving whatever detail was fetched persisted.

> The list screen's empty-DB "first sync" gate (`FirstSyncProgress`, shown while DB empty + sync in
> flight) should release after **`pullJobs`** so the list paints immediately; the detail phase then
> reports progress through the sync indicator. (Today the gate keys off the empty DB; once `pullJobs`
> writes rows it naturally releases — verify and keep that behaviour.)

### 2. New sync function `hydrateJobDetails` (`database/sync/syncEngine.ts`)

```ts
export async function hydrateJobDetails(
  signal?: AbortSignal,
  onProgress?: (done: number, total: number) => void,
): Promise<void>
```

Algorithm:

1. **Select work set** via a new query `getJobsNeedingDetail()` (`queries/jobs.ts`): jobs where
   `job_details` is missing **or** `job_details.job_modified_at` ≠ `jobs.modified` (LEFT JOIN).
   Optionally order so the **current user's assigned jobs come first** (driverId match), then the
   rest — best offline value soonest on big tenants.
2. **Fetch with bounded concurrency** (`DETAIL_HYDRATION_CONCURRENCY`, default 4–6 — API has no
   rate limiting per CLAUDE.md, but cap to be polite and bound memory). A small pool/worker over the
   id list; each worker calls `getJobDetail(id, signal)`.
3. **Per-job failure isolation:** wrap each fetch in try/catch — on error, log and **continue**
   (count as failed-this-round, not fetched). A failed job stays "needing detail" (its
   `job_modified_at` is unchanged), so the next sync retries it. One bad detail never aborts the run.
4. **Persist detail-only:** new query `upsertJobDetailRow(detailRow, jobModifiedAt)` that inserts into
   **`job_details` only** (never the `jobs` row), setting `hydrated_at` + `job_modified_at`. This is
   the key reconciliation guarantee — status/assignment stay as the list pull reconciled them.
5. **Progress:** call `onProgress(done, total)` after each completion.
6. **Abort:** check `signal?.aborted` between batches; `getJobDetail` already accepts a signal —
   thread it so in-flight requests cancel too (note: `services/api/jobs.ts:14` must be updated to pass
   `signal` to `apiClient.get`, which it currently does not).

### 3. Reconciliation rule (the heart of AC #3)

- **Status & assignment** live on the `jobs` row and are reconciled **once**, in `pullJobs` via
  `reconcileOptimistic` (`database/sync/reconcileOptimistic.ts`): server value, except optimistic
  local value overlaid for jobs with a pending/in-progress outbox `UPDATE_STATUS`/`ASSIGN_DRIVER`.
- **Detail hydration does not write status/assignment at all** → it cannot revert a pending write.
  This removes the latent bug above by construction.
- **Fix the per-screen path too:** change `useJobDetail`'s hydration to use the same detail-only
  writer (`upsertJobDetailRow`) instead of `upsertJobWithDetail`, OR have `upsertJobWithDetail`
  skip status/assignment columns when an outbox mutation is pending for that job. Recommended:
  route both bulk and per-screen hydration through `upsertJobDetailRow` and **retire**
  `upsertJobWithDetail` (the `jobs` row is always sourced from the list pull). Keep one write path.
- The detail **blobs** (stops/journey/quote/payment) are never edited offline, so plain server-wins
  is correct for them — no reconciliation needed.

### 4. Schema / migration (incremental support)

Add one column to `job_details` so we can detect "this job changed since we hydrated it":

```ts
// database/schema.ts — jobDetails
jobModifiedAt: text('job_modified_at'),   // jobs.modified captured at hydration time
```

- Generate a migration with drizzle-kit (`0002_*`); it runs on app start via the existing migration
  runner (`database/client.ts`). New column is nullable → existing rows reported as "stale" once and
  re-hydrated on the next online sync (acceptable, self-heals).
- `getJobsNeedingDetail()` compares `jobs.modified` to `job_details.job_modified_at`.

### 5. UX

- **First sync:** make `FirstSyncProgress` (or a successor banner) **determinate** for the detail
  phase: "Setting up — downloading job details… {done}/{total}", driven by `onProgress`. Plumb
  progress through `connectivityStore` (e.g. `detailHydration: {done, total} | null`).
- **Refresh / background:** the existing `SyncStatusIndicator` spinner already covers "syncing";
  optionally show "{done}/{total}" while the detail phase runs. No blocking.
- **Job detail offline:** with bulk hydration, `detail` is normally present offline. Keep the
  on-mount online refresh (cheap, fetches the very latest), and when offline show the persisted
  detail with an "as of {hydratedAt}" note (`useJobDetail` already exposes `hydratedAt` via the row).

### 6. Scale & background limits

- **Incremental** (AC #4) keeps steady-state cost ~zero; only deltas hydrate.
- **Big tenants** (hundreds/thousands of jobs): first sync is the only heavy run. Bounded
  concurrency + assigned-first ordering give useful offline coverage quickly. Consider an optional
  ceiling (`MAX_DETAIL_HYDRATION`, default unlimited) for pathological tenants, logged when applied
  (no silent caps).
- **Background fetch** has a limited time budget (`expo-background-fetch`): hydrate in chunks; the
  incremental work set makes it **naturally resumable** — whatever didn't finish is still "needing
  detail" next run.

---

## Task checklist

> **Status: implemented + E2E-verified 2026-06-03.** All unit tests pass (`npx jest` — 84 suites /
> 475 tests), `tsc --noEmit` clean, `eslint` clean, and **all 9 Maestro flows green on `Pixel_9`**
> (incl. the new `offline-detail.yaml`: open a never-opened job offline → full detail + "as of" note).
> The migration is `0005_living_kingpin` (the repo was already at `0004`, not `0001`, so the new
> column landed at `0005`, not the `0002` the draft assumed).
> Per-screen `pullJobDetail` now writes the detail blob **only** — it no longer creates/updates the
> `jobs` row, so a deep-link to a job not yet in the list shows "Job not found" until the next list
> pull (acceptable: the `jobs` row is always sourced from the list, per §3).

- [x] `services/api/jobs.ts`: pass `signal` through `getJobDetail` (was dropped).
- [x] `database/schema.ts`: add `job_modified_at` to `jobDetails`; migration `0005_living_kingpin`
  (generated + mirrored into the hand-maintained `migrations/bundle.ts` the test DB & device share).
- [x] `database/queries/jobs.ts`:
  - [x] `getJobsNeedingDetail()` — LEFT JOIN jobs↔job_details, missing-or-stale, assigned-first order.
  - [x] `upsertJobDetailRow(detail, jobModifiedAt)` — writes `job_details` **only** (sets `hydrated_at` + `job_modified_at`).
  - [x] Retired `upsertJobWithDetail` — single detail-only write path through `upsertJobDetailRow`.
- [x] `database/sync/syncEngine.ts`: `hydrateJobDetails(signal, onProgress)` — bounded worker pool,
  per-job try/catch, abort checks, `MAX_DETAIL_HYDRATION` ceiling (logged, not silent). `pullJobDetail`
  routed through `upsertJobDetailRow`.
- [x] `hooks/useSync.ts`: detail phase after `pullJobs`; abort signal threaded; progress → `connectivityStore`.
- [x] `hooks/useJobDetail.ts` / job detail screen: persisted detail shown offline + "Showing details as of …" note.
- [x] `stores/connectivityStore.ts`: `detailHydration` progress state (+ setter).
- [x] `components/sync/FirstSyncProgress.tsx` + `SyncStatusIndicator`: determinate detail progress.
- [x] `constants/`: `DETAIL_HYDRATION_CONCURRENCY` (5) + `MAX_DETAIL_HYDRATION` (0 = uncapped).
- [x] Docs: `docs/SMOKE_TESTING.md`, spec §11.4, `BACKLOG.md`; new `.maestro/offline-detail.yaml`.

## Testing

- **Unit**
  - `hydrateJobDetails`: hydrates missing + stale only; skips up-to-date (zero requests); bounded
    concurrency; one failing id doesn't abort and isn't marked hydrated; respects abort signal.
  - `getJobsNeedingDetail`: missing, stale (modified advanced), up-to-date; assigned-first order.
  - `upsertJobDetailRow`: writes blob + `job_modified_at`, **does not** touch `jobs.status_type_id`/`driver_id`.
  - Reconciliation: job with pending `UPDATE_STATUS` keeps optimistic status through a full
    list→detail sync (regression for the latent bug).
- **E2E (Maestro, `docs/SMOKE_TESTING.md`)**
  - New `offline-detail.yaml`: login → wait for sync to settle → go offline → open a job **never
    opened this session** → assert route/stops/customer/pricing render → reconnect. (Run on
    `api-driver`; deterministic given a settled sync.)
- **Manual:** big-tenant first-sync timing; background-fetch resumption after kill mid-hydrate.

## Edge cases & risks

- **Status double-source:** mitigated by detail-only writes — `jobs` status is reconciled exactly
  once, in `pullJobs`.
- **Detail vs list status skew within one cycle:** list sets reconciled status; detail doesn't touch
  it; next cycle re-reconciles. No flicker.
- **Pruned jobs:** `replaceJobs` already deletes `job_details` for jobs the server dropped — bulk
  hydration only ever targets jobs still present. No orphan growth.
- **PHP-noise / `wpdberror` on `?id=`** (see API_NOTES §5, the 2026-06-02 regression that emptied
  every detail): `parseApiBody` defence-in-depth still applies; a malformed detail now fails **one
  job** (retried next sync) instead of the whole detail screen — strictly more robust than today.
- **Token/401 mid-hydration:** existing 401 interceptor clears session → redirect to login; partial
  hydration persists harmlessly.

## Out of scope / follow-ups

- Notify-on-silent-overwrite (already deferred in `BACKLOG.md`).
- Prefetching **customer** detail or driver detail in bulk (separate concern).
- Editing detail blobs offline (no offline edit of stops/quote/payment exists; no reconciliation
  needed for the blob).
