# Component & Library Recommendations

Curated libraries for the best end result on **Expo 56 / RN 0.85 / React 19 (New Architecture)**.
Every pick below is verified **New-Architecture compatible** and, where native, pinned to the
version Expo bundles for SDK 56 (`expo/bundledNativeModules.json`). Add native libs with the
SDK-pinned version and re-run `npx expo-doctor`.

Legend: **Now** = install in M0/M1 · **When** = install at the milestone that needs it.

---

## Already chosen (in CLAUDE.md / installed)

| Concern | Library | Version | Notes |
|---|---|---|---|
| Navigation | expo-router | ~56.2.8 | file-system routing; typed routes |
| Client state | zustand | ^5 | auth/config/connectivity stores |
| Server state | @tanstack/react-query | ^5 | sync orchestration |
| Local DB | expo-sqlite + drizzle-orm | 56.0.x / 0.45 | offline-first core (ADR-001) |
| Secure storage | expo-secure-store | ~56.0.4 | token + client credentials |
| Connectivity | expo-network | ~56.0.4 | online/offline detection |
| Dates | dayjs | ^1.11 | ISO 8601 parsing (never `new Date()`) |
| HTTP | axios | ^1 | apiClient interceptors |

---

## Recommended additions

### UI building blocks

| Concern | Pick | Version (SDK 56) | Why this one | When |
|---|---|---|---|---|
| **Long lists** (jobs, drivers, customers) | **@shopify/flash-list** | 2.0.2 | v2 is built for the New Arch; far less jank than FlatList on large job lists — directly serves the "zero-latency, no jank" perf AC. | M1 |
| **Bottom sheets** (Filter Sheet §6.4, Status picker §6.5F) | **@gorhom/bottom-sheet** | ^5.2 | The spec's core interaction is a slide-up filter sheet. v5 supports New Arch + Reanimated 4. | M2/M3 |
| **Gestures** (peer of bottom-sheet/flash-list) | react-native-gesture-handler | ~2.31.1 | required peer; Expo-bundled. | with above |
| **Animations** (peer of bottom-sheet) | react-native-reanimated | 4.3.1 | required peer; v4 is New-Arch native. Add its Babel plugin. | with above |
| **Vector icons** | @expo/vector-icons | (bundled w/ expo) | already available via Expo — no install; use for toolbar/status icons. | M1 |
| **SVG** (badges, custom marks) | react-native-svg | 15.15.4 | peer of maps + charts; Expo-bundled. | M2 |

### Forms & inputs

| Concern | Pick | Version | Why | When |
|---|---|---|---|---|
| **Date range pickers** (filter §6.4) | @react-native-community/datetimepicker | 9.1.0 | native pickers; Expo-bundled, New-Arch ready. | M3 |
| **Form state/validation** (onboarding, login, filters) | react-hook-form + zod | ^7 / ^3 | minimal re-renders, typed schemas; zod can also validate API responses (CLAUDE.md "validate on receipt"). Pure JS — no native concerns. | M1 |

### Maps (Job detail Route Map §6.5B)

| Concern | Pick | Version | Why | When |
|---|---|---|---|---|
| **Map view** | react-native-maps | 1.27.2 | spec-named; Expo-bundled. Needs a config-plugin entry + Google Maps API key (Android) — **see Open Question on provider/keys in BACKLOG**. | M2 |
| **Native nav deep link** | `expo-linking` (already installed) | ~56.0.13 | "open in Maps app" (US-015) is just a `geo:`/`maps://` URL — no extra lib. | M2 |

### Notifications & background (spec §10 Option B)

| Concern | Pick | Version | Why | When |
|---|---|---|---|---|
| **Local notifications** | expo-notifications | ~56.0.15 | Option B = local notifications off the sync diff; no relay server. | M4 |
| **Background sync** | **expo-background-task** + expo-task-manager | ~56.0.16 | ⚠️ **`expo-background-fetch` (named in CLAUDE.md) is deprecated/renamed** — use `expo-background-task` on SDK 56. | M4 |

### Quality / DX (dev-only)

| Concern | Pick | Status | Notes |
|---|---|---|---|
| Unit tests | jest-expo + @testing-library/react-native | ✅ installed | jest pinned to **29** (jest-expo 56 is built on Jest 29 internals — do not bump to 30). |
| Lint | eslint + eslint-config-expo (flat) | ✅ installed | `eslint.config.js`. |
| E2E (Android) | Detox | When (M5) | per CLAUDE.md testing standards. |
| Error tracking | sentry-expo *(optional)* | Consider M5 | crash/error visibility in the field. |

---

## Deliberately NOT recommended

- **WatermelonDB** — rejected, New-Arch incompatible (ADR-001).
- **NativeWind / styled-components** — CLAUDE.md mandates `StyleSheet.create()`.
- **react-native-mmkv for filters** — filter persistence is non-sensitive; the already-installed
  AsyncStorage (or a `filters` row in SQLite) is sufficient. Reserve secure-store for secrets only.
- **Redux** — Zustand + TanStack Query already cover client/server state per CLAUDE.md.
- **moment.js** — unmaintained/heavy; dayjs chosen.

---

## Install commands (when each milestone needs them)

```bash
# M1 — lists + forms
npx expo install @shopify/flash-list react-native-gesture-handler react-native-reanimated
npm install react-hook-form zod

# M2 — maps + sheets + svg
npx expo install react-native-maps react-native-svg @react-native-community/datetimepicker
npm install @gorhom/bottom-sheet

# M4 — notifications + background
npx expo install expo-notifications expo-background-task expo-task-manager
```

> In this sandbox `npx expo install` can't reach the Expo API (TLS), so versions were installed
> with `npm install <pkg>@<bundled-version>`. On the dev machine, prefer `expo install` so the
> SDK-correct version is chosen automatically. Reanimated requires its Babel plugin in
> `babel.config.js`; gesture-handler must wrap the root in `GestureHandlerRootView`.
