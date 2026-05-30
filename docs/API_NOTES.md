# API Notes — Verified Live Behaviour

> **Authoritative wire contract.** This file records how the TransitQuote REST API
> *actually* behaves, verified against the live test site
> (`https://tq-pro-teams-php8.ddev.site`) on **2026-05-30**. Where this document and the
> illustrative JSON in [`MOBILE_APP_REQUIREMENTS.md`](../MOBILE_APP_REQUIREMENTS.md) §8
> disagree, **this document wins** — the spec examples were hand-written before live access.
> The typed shapes derived from this live behaviour live in [`types/api.ts`](../types/api.ts).

---

## 1. Authentication is a two-step OAuth2 authorization-code grant

The spec's "login → token" is actually two calls in two different namespaces:

**Step 1 — `POST /wp-json/transitquote/v1/rest_login`** (JSON body):
```json
{ "username": "...", "password": "...", "client_id": "...", "client_secret": "..." }
```
Returns an **authorization code**, not a usable token:
```json
{ "data": { "ID": 284, "roles": ["Driver"], ... }, "code": "92SVPEKjohMP", "success": true }
```
> Using `code` directly as a Bearer token is rejected with **403** (`invalid_token`).

**Step 2 — `POST /wp-json/oauth2/access_token`** (`application/x-www-form-urlencoded`):
```
grant_type=authorization_code&code=<code>&client_id=<id>&client_secret=<secret>
```
Returns the access token:
```json
{ "access_token": "5y1ilVNqOMt4", "token_type": "bearer" }
```

**Step 3 —** send `Authorization: Bearer <access_token>` on all other endpoints.

- `client_id` / `client_secret` are **per-WordPress-install** OAuth app credentials (set by the
  site admin), shared by all users on that site. Store them in `expo-secure-store` per site.
- The access token is what `authStore` persists — not the authorization code.

## 2. Response envelope has NO `message` field on success

Success responses are exactly `{ data, success }`:
```json
{ "data": { ... }, "success": true }
```
There is **no `message`** on success. Error responses use the standard WordPress REST shape,
which *does* carry a message:
```json
{ "code": "rest_missing_callback_param", "message": "Missing parameter(s): client_id, client_secret",
  "data": { "status": 400, "params": ["client_id","client_secret"] } }
```
→ Surface `message` from **error** responses; never read it on the success path.

## 3. Everything is string-typed (WordPress serialisation)

Ids, money, counts, and booleans all arrive as **strings**, and fields may be `null`:
- ids: `"1"`, `"432"`  ·  money: `"42.00"`  ·  booleans: `"0"` / `"1"` (sometimes `""`)
- The mapping layer must coerce; never `===` a wire value against a number/boolean.
- **One exception found:** `configuration.user.wp_user_id` is a real number, unlike ids elsewhere.

## 4. Dates

MySQL datetimes (`"2026-05-12 19:29:05"`), and frequently the zero sentinel
`"0000-00-00 00:00:00"`. Guard for the sentinel before parsing with dayjs (treat as null).

## 5. ⚠️ PHP `Deprecated` warning prepended to JSON (temporary)

`/configuration` and `/jobs` currently emit a PHP notice as raw HTML *before* the JSON body:
```
<br /><b>Deprecated</b>: Creation of dynamic property TQ_API_Public::$team_plugin ...
{ "data": ... }
```
This breaks `JSON.parse` / Axios's default parsing. **The server team is fixing this.**
Until the fix ships, `apiClient` uses a defensive `transformResponse` that strips everything
before the first `{` / `[`. `/customers` is already clean. Once the server fix lands, the strip
becomes a harmless no-op and can be removed.

## 6. `GET /configuration` → `data`

Keys: `team_settings, services, vehicles, status_types, payment_status_types, drivers, user`.

- **`team_settings`** carries ~120 fields (form theming, labels, rate rules). Relevant ones:
  - **`job_assignment`** — `"Centralized"` | `"Decentralized"`. _(Replaces the spec's
    `tt_job_assignment_mode` / `tt_driver_role_name`; those field names do not exist.)_
  - `tt_role` — the user's role name (display only).
  - **Currency** is `currency` = a numeric **id** as a string (e.g. `"18"`), plus
    `custom_currency_code` / `custom_currency_symbol`. Also `tax_rate`, `tax_name` (`"VAT"`),
    `distance_unit` (`"Mile"`), `weight_unit_name` (`"kg"`).
  - **Maps** = Google Maps (`map_api_version: "google_maps_v3"`); the key is provided in-config
    as `api_key` / `api_key_v3`. Base/depot location in `start_lat` / `start_lng` / `start_location`.
- **`status_types`** is an **object keyed by id string** (`{ "1": {...}, "2": {...} }`), NOT an array.
  `services`, `vehicles`, `payment_status_types`, `drivers` are arrays.
- **`drivers[].can_assign_to`** is a **driver id string** (e.g. `"432"`) — the id this driver may
  assign to — **not a boolean**. Cross-reference against the `drivers` list at assignment time.
- **`user`** = `{ wp_user_id (number), user_nicename, first_name, last_name, roles[], avatar_url }`.
  There is **no `driver_id` and no `driver_can_assign_to`** on the user object (the spec invented these).

## 7. Jobs: flat list vs nested detail

- **`GET /jobs`** returns a flat array of jobs. Each carries denormalised display fields
  (`status_name`, `driver_name`, `payment_type_name`, `payment_status_name`, customer `last_name`)
  and a heavy per-job `settings_snapshot` JSON-string blob — **but no nested data**
  (~365 KB for 41 jobs, mostly the snapshots).
- **`GET /jobs?id={id}`** returns one job with nested **`customer`, `journey`, `stops[]`, `quote`**,
  plus display-only `job_date[]` and `payment[]` (each an array of `{label, value}` pairs).
- → The sync engine **must hydrate detail per job** via the `?id=` call; the list never has it.

## 8. Role access (confirmed)

Gated by WP **role name** (lowercased), not per-capability:

| Endpoint | Driver | Dispatch | administrator |
|---|---|---|---|
| `GET /configuration`, `GET /jobs`, `POST /jobs/update_job_status` | ✅ | ✅ | ✅ |
| `POST /jobs/update_assigned`, `POST /assign` | ❌ | ✅ | ✅ |
| `GET /customers`, `GET /customers/{id}` | ❌ | ✅ | ✅ |

## 10. Write endpoints (verified live 2026-05-30, reversibly)

Both take `id` (the job id, **not** `job_id`) and expose a top-level `success`. Their envelopes
are otherwise **inconsistent** with each other and with reads:

**`POST /jobs/update_job_status`** — JSON body `{ "id": <jobId>, "status_type_id": <id> }`.
- Success (HTTP 200): `{ data: <full updated job>, success: true }` (same top-level `success` as reads).
- Verified by changing job 1 status 2→3→2 (reverted). All roles may call it.

**`POST /jobs/update_assigned`** — Dispatch/Admin only. ⚠️ **Two server bugs:**
1. Must be sent **form-urlencoded** (`id=..&driver_id=..`). A **JSON** body crashes the server with
   `HTTP 500 — Uncaught TypeError: urldecode(): Argument #1 must be of type string, int given`.
2. `driver_id` must reference `drivers.id` (FK `wp_tq_pro4_job_assignments.driver_id`). Passing a
   `wp_user_id` fails the FK constraint (500).
- Envelope uses **`msg`**, not `message`: failure → `{ msg: "Could not update job id<N> to driver id: ", success: false }`.
- Missing `id` → `{ code: "rest_missing_callback_param", message: "Missing parameter(s): id", data: { status: 400 } }`.
- A **successful** assignment was NOT confirmed: the only test driver (id 432) is `available: "0"`, and a
  successful assign couldn't be cleanly reverted to "unassigned". Shape implemented from the evidence; the
  happy path needs re-verification once an assignable driver exists. **Both bugs reported to the server team.**

Client handling (services/api/jobs.ts): `update_job_status` posts JSON; `update_assigned` posts
form-urlencoded. A 200 with `success: false` is raised as `ApiActionError` → the outbox marks it
**failed** (permanent, no retry).

## 9. Open items still to verify against live

- **Centralized server-side filtering:** the Driver and Dispatch `GET /jobs` returned
  byte-identical 41-job lists — the "filtered to this driver" behaviour was **not observed**.
  Confirm whether Centralized actually filters server-side, or the app must filter by `driver_id`.
- **update_assigned happy path:** see §10 — needs an available driver to confirm a successful assignment.
