# ADR-001 — Local Database Engine

**Status:** Accepted · 2026-05-30
**Decision:** Use **`expo-sqlite` + Drizzle ORM** for the offline-first local database.
**Supersedes:** The WatermelonDB references throughout `CLAUDE.md` and `MOBILE_APP_REQUIREMENTS.md` §11.

---

## Context

The app is offline-first (spec §11): the UI always reads from a local SQLite database,
and a background sync layer keeps it fresh. The original spec and `CLAUDE.md` named
**WatermelonDB** as the engine. The installed stack, however, is:

| Package | Installed version |
|---|---|
| expo | 56.0.8 |
| react-native | 0.85.3 |
| react | 19.2.3 |

On this stack the **New Architecture (Fabric + TurboModules + Bridgeless) is mandatory** —
the legacy architecture was removed in React Native 0.82.

## The blocker

WatermelonDB does not reliably support the New Architecture:

- [Nozbe/WatermelonDB#1769](https://github.com/Nozbe/WatermelonDB/issues/1769) — Bridgeless support, open since RN 0.74, no merged fix.
- [Nozbe/WatermelonDB#1851](https://github.com/Nozbe/WatermelonDB/issues/1851) — RN 0.76+ with JSI enabled reported non-functional.

Adopting WatermelonDB would force us to either downgrade the entire stack (RN ≤ 0.81)
or ship on a broken/patched native dependency. Both are unacceptable for a foundation
the whole app depends on.

## Options considered

| Option | New Arch | Expo managed | Reactive queries | Typed schema + migrations | Verdict |
|---|---|---|---|---|---|
| **WatermelonDB 0.28** | ❌ unresolved | needs config plugin + dev client | ✅ built-in | partial | **Rejected** — blocker above |
| **expo-sqlite (SDK 56 → v56.0.x) + Drizzle 0.45** | ✅ native | ✅ first-party | ✅ `useLiveQuery` | ✅ Drizzle + drizzle-kit | **Chosen** |
| op-sqlite 16 + Drizzle | ✅ native (JSI) | ⚠️ third-party native, config plugin | ✅ via Drizzle | ✅ | Viable fallback; heavier, non-Expo |

## Decision rationale

`expo-sqlite + Drizzle` gives us everything WatermelonDB was selected for:

- **Reactive UI** — `useLiveQuery` from `drizzle-orm/expo-sqlite` re-renders on DB change,
  satisfying the spec's "UI reacts to DB changes" requirement (§11.1). Where a raw query
  is needed, `expo-sqlite`'s `addDatabaseChangeListener` is the lower-level primitive.
- **Typed schema + migrations** — Drizzle schema is the source of truth; `drizzle-kit`
  generates migrations. Replaces WatermelonDB's `@field`/`@json`/`@relation` models.
- **First-party + future-proof** — maintained by Expo, tracks each SDK, runs in Expo Go.
- **Resolves the Expo Go contradiction** — global CLAUDE.md says "iOS: Expo Go on physical
  device," which WatermelonDB could not honour. `expo-sqlite` works in Expo Go, so the
  existing dev loop stands.

## Consequences / migration notes

The architecture in the spec is unchanged — only the engine swaps. When reading
`MOBILE_APP_REQUIREMENTS.md` §11 and `CLAUDE.md`, translate:

| Spec/CLAUDE.md says | Read as |
|---|---|
| `database/models/*` (WatermelonDB model classes) | `database/schema.ts` (Drizzle tables) |
| `@field` / `@json` / `@relation` decorators | Drizzle column builders + relations |
| "WatermelonDB reactive query" | `useLiveQuery(db.select()...)` |
| `prepareUpdate()` + batch write | Drizzle `db.transaction(...)` |
| `synchronize()` (WatermelonDB sync protocol) | hand-rolled sync engine per spec §11.4–11.6 (we were building this ourselves regardless) |

The §11.2 table/column list is engine-agnostic and still authoritative — mirror it exactly
as Drizzle tables.

## Follow-ups

- [ ] Install `expo-sqlite`, `drizzle-orm`, `drizzle-kit` (Milestone 0).
- [ ] Build a thin proof-of-concept: schema → write → `useLiveQuery` re-render — before fanning out screens.
- [ ] Update `CLAUDE.md` folder structure: `database/schema.ts` replaces `database/models/`.
