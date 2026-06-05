---
name: inspect-device-db
description: Inspect TQApp's on-device SQLite database (jobs, outbox, sync state) on the Android emulator. Use when debugging offline data, a stuck/failed outbox item, sync problems, or "why is there a pending/failed message". Avoids the run-as + inline-sqlite quoting failures hit in past sessions.
---

# inspect-device-db — read TQApp's on-device SQLite

DB path on device: `/data/data/com.transitteam.app/files/SQLite/tqapp.db`
(app is debug/run-as'able as `com.transitteam.app`).

**Do NOT** try to run `sqlite3` over `adb shell run-as ... sqlite3 "SELECT ..."` — `sqlite3`
isn't on the device (`NO_SQLITE3`) and the nested quoting fails (`no closing quote`,
`unexpected 'last_error,...'`). These exact errors burned several turns before. Instead, **copy
the DB file off-device and query it on the host.**

## 1. Copy the DB off the device (run-as → /sdcard → pull)
```bash
cd C:/Users/andre/AndroidStudioProjects/TQApp; export MSYS_NO_PATHCONV=1; \
adb shell "run-as com.transitteam.app cat files/SQLite/tqapp.db > /sdcard/tqapp.db" && \
adb pull /sdcard/tqapp.db "C:/Users/andre/AppData/Local/Temp/tqapp.db" 2>&1 | tail -1
```
`run-as ... cat > /sdcard/...` sidesteps file-permission issues; the single double-quoted
`adb shell "..."` keeps the redirection on-device. No nested SQL = no quoting hell.

## 2. Query it on the host
Prefer a tiny Node reader over a fragile one-liner (Node is on PATH). If the project has a
sqlite driver (`better-sqlite3` / `expo-sqlite` is RN-only, so use `better-sqlite3` if present),
write a throwaway script to `C:/Users/andre/AppData/Local/Temp/q.mjs`:
```js
import Database from 'better-sqlite3';
const db = new Database('C:/Users/andre/AppData/Local/Temp/tqapp.db', { readonly: true });
console.log('tables:', db.prepare("select name from sqlite_master where type='table'").all());
console.log('outbox:', db.prepare('select id,status,last_error,attempts,created_at from outbox order by id desc limit 20').all());
```
If no sqlite driver is installed, fall back to the `sqlite3` CLI if available
(`sqlite3 <tmp>/tqapp.db ".tables"`), else tell the user which package to add rather than
guessing column names.

## What to look for when chasing a failed/pending outbox item
- `outbox.status` (pending / failed) and **`outbox.last_error`** — surface the raw error verbatim.
- 4xx failures are intentionally NOT auto-retried (see CLAUDE.md Outbox Pattern) — they need user
  action. Don't "fix" by forcing a retry; report the cause.
- Cross-check against the backend: the DDEV test DB is queryable from WSL
  (`tq-pro-teams-php8.ddev.site`) — see the test-users / API-fields docs referenced in memory.

## Cleanup
Remove the copies when done: `adb shell rm /sdcard/tqapp.db` and the host temp file.
