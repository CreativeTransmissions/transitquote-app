# Agent Notes — TransitTeam Mobile

**Expo HAS CHANGED.** This project runs a bleeding-edge stack — do not assume older API shapes.
Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing native code.

## Single source of truth
- **Architecture & conventions:** `CLAUDE.md`
- **Product spec:** `MOBILE_APP_REQUIREMENTS.md`
- **Versions:** `package.json` (NOT prose in any doc)
- **Key decisions:** `docs/` (ADRs). DB engine = `docs/DB_ENGINE_DECISION.md`.
- **What to build next:** `ROADMAP.md` + `BACKLOG.md`

## Hard constraints
- RN 0.85 → **New Architecture is mandatory.** Any native lib must be New-Arch compatible
  (`npx expo-doctor`). WatermelonDB is rejected for this reason — use expo-sqlite + Drizzle.
- Offline-first: the UI reads from local SQLite, never from the API directly.
- Secrets (token, client_id/secret) → `expo-secure-store` only, never AsyncStorage.
