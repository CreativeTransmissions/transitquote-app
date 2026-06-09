# UI Modernization, Performance, Accessibility & In-Context Help — Improvement Report

**Date:** 2026-06-09
**Scope:** TransitTeam Mobile (TQApp) — Expo SDK 56 / RN 0.85 / New Architecture
**Inputs:** Full codebase audit (UI inventory, performance, accessibility), `MOBILE_APP_REQUIREMENTS.md` + `docs/`, the TransitTeam WordPress plugin source (`\\wsl$\Ubuntu\home\andrew\projects\tq-pro-teams-php8`), and a live emulator screenshot of the current build.

---

## 1. Executive Summary

The app is functionally complete and architecturally strong (offline-first reads, event-driven sync, clean token system, consistent spacing/typography). The gap to a "modern" feel is **not structural — it is surface-level and very addressable**:

1. **No icon system** — navigation and actions are plain text links and unicode glyphs (`‹`, `↻`, `⚠`). This is the single biggest contributor to the dated look.
2. **No bottom tab bar** — primary navigation is small text links in the top-right header, the hardest place to reach one-handed in a vehicle.
3. **No dark mode** — a real problem for drivers at night (full-white `#FFFFFF` screens).
4. **No motion or haptics** — every state change is an instant cut; confirmations are `Alert.alert` dialogs with no tactile feedback.
5. **Job cards under-use available data** — payment status, service type, and stop count exist locally but aren't shown; status is conveyed by a 9px dot.
6. **Help is reactive, not proactive** — good error explanations exist (`SyncProblemsSheet`), but there is no first-run guidance and no explanation of role/mode differences.

Everything proposed below keeps the app **minimal, light-dependency, and glove/sunlight-practical**, stays inside the v1 scope fence (spec §14), and uses only New-Arch-compatible libraries (most bundled with Expo SDK 56 already).

---

## 2. Current-State Assessment (evidence)

| Area | State | Evidence |
|---|---|---|
| Design tokens | Good: 15 colours, 6 type roles, 4pt spacing, shadows, card preset | `constants/colours.ts`, `typography.ts`, `spacing.ts`, `cards.ts` |
| Theme | Light only, `userInterfaceStyle: "light"`, hardcoded hexes | `app.json`, all components |
| Icons | None — unicode glyphs (`‹ › ✓ ↻ ⚠`) | `JobCard.tsx`, back links, `StopList.tsx` |
| Navigation | Stack only; header text links "Drivers / Customers / Profile" | `app/(app)/jobs/index.tsx:58-68` |
| Animation/haptics | None (no reanimated, no expo-haptics); `animationType="slide"` modals only | `package.json` |
| Lists | FlatList everywhere, no `React.memo` items, no layout hints | `components/jobs/JobList.tsx:31` |
| A11y | Roles/states on Button, tabs, pickers ✓; labels missing on back buttons & spinners; no dark mode; no `maxFontSizeMultiplier` | a11y audit §1–§9 |
| Help | Good empty states + outbox error explanations; zero first-run guidance | `EmptyState.tsx`, `outboxMessages.ts` |
| Off-palette colours | Hardcoded `#FDECEA`, `#E6F4EA` in failure boxes / availability badges | `jobs/[id].tsx`, `DriverCard.tsx`, `SyncProblemsSheet.tsx` |

Server findings relevant to the UI (from the plugin source):

- `status_types` has **no colour column** on this install — keep the client-side fallback palette, but map by *semantic name* not index (see §3.4).
- **Payment status** (`payment_status_id` + name) is already synced locally but not rendered on cards — spec §6.4 actually requires a payment badge.
- **Per-stop status** (`location_status_id`, `update_job_location_status`) exists server-side but is **AJAX-only** → stays out of scope (spec §14); however per-stop *display* data (scheduled time, ASAP flag) is in `stops_json` and can be surfaced read-only.
- Currency must come from `custom_currency_code`/`custom_currency_symbol` (already documented in API_NOTES).

---

## 3. UI Modernization Specification

Design direction: **"calm utility"** — the current green/white identity is good; modernize through iconography, depth, motion restraint, and dark mode rather than a restyle. Reference points: Material 3 expressive-but-restrained surfaces, iOS-style bottom sheets with grabbers, logistics apps (Onfleet, Circuit, Routific driver apps) which all converge on: bottom tabs, big status-forward cards, one primary action per screen.

### 3.1 Icon system (P0 — highest visual ROI, lowest risk)

- **Library:** `@expo/vector-icons` (already bundled with Expo SDK — zero new native deps). Use **one family** for coherence: `MaterialCommunityIcons`.
- Replace all unicode glyphs:

| Current | Replace with | Where |
|---|---|---|
| `‹` back text | `chevron-left` (28dp) | all detail screens |
| `›` chevron | `chevron-right` (20dp, `textMuted`) | StopList rows, cards |
| `✓` | `check` (20dp, `primary`) | pickers, site switcher |
| `↻ Pending sync` | `clock-outline` + text | JobCard sync state |
| `⚠ Update failed` | `alert-circle` + text | JobCard, failed banner |
| "Filter" text | `filter-variant` + text | bottom toolbar |
| "Refresh" text | `refresh` + text | bottom toolbar |
| (none) | `map-marker-outline`, `phone-outline`, `email-outline`, `truck-outline`, `account-outline` | detail rows, cards |

- **Rule:** an icon never appears without either a visible text label or an `accessibilityLabel`. Icons are supporting, not replacing, text (sunlight/glove readability).
- New `components/shared/Icon.tsx` wrapper: takes `name`, `size` (`sm`=16, `md`=20, `lg`=28), `colour` token — keeps usage consistent and theme-aware.

### 3.2 Bottom tab navigation (P0)

Replace header text links with an Expo Router `Tabs` layout in `(app)/_layout.tsx`:

- **Driver:** `Jobs` (briefcase icon) · `Profile` (account icon) — 2 tabs.
- **Dispatcher/Admin:** `Jobs` · `Drivers` · `Customers` · `Profile` — 4 tabs.
- Role-gating via `useRole()` composition (existing pattern) — render tab screens conditionally with `<Tabs.Screen options={{ href: null }}>` for hidden tabs, per the Open/Closed guidance in CLAUDE.md.
- Tab bar spec: 64dp height + bottom inset, active tint `primary`, inactive `textMuted`, label `TYPOGRAPHY.label`, top hairline `border`. Badge on Jobs tab when `failedCount > 0` (danger dot).
- The current bottom Filter/Refresh toolbar on Jobs **stays**, but moves to a floating pill above the tab bar OR becomes a header-row of chips (see 3.3). Recommendation: keep a slim toolbar directly above the tab bar — drivers know it.
- The sync status indicator stays in the Jobs header next to the title.
- **Acceptance:** all four sections reachable with the thumb; back-link Pressables removed from list screens (tabs replace them); detail screens keep an icon back button.

### 3.3 Job card redesign (P0)

Current card: ref + tiny status dot, customer, date, address, all left-aligned, 3px green left border on every card. Spec §6.4 wants service type, vehicle, payment badge too. New layout (data all available locally):

```
┌──────────────────────────────────────────┐
│ MTS9139384340            [● In Transit]  │  ref: subheading · status pill right
│ Test, TC31                               │  customer: body
│ ⌖ Station Road, Hook RG27 9QW            │  pickup addr: caption + map-marker icon
│ 🕐 16 May, 09:30 · ASAP                  │  time row: caption + clock icon
│ ─────────────────────────────────────    │  hairline
│ Same Day · Van          [Unpaid] [3 stops]│  meta row: service · vehicle · badges
└──────────────────────────────────────────┘
```

- **Status left border:** colour the existing 3px left border with the *status colour* instead of constant `primaryLight` — status becomes scannable down the whole list without reading badges.
- **Status pill:** keep dot+text but raise dot to 10dp and give the pill the status colour at 12% opacity background, full-strength text — modern "tinted chip" pattern, still readable in sun.
- **Payment badge:** small chip, `Unpaid` = warning tint, `Paid` = success tint (data already in `jobs.payment_status_id` + `payment_status_types` table).
- **Driver row (dispatcher only):** keep, prefix with `account-outline` icon; "Unassigned" rendered in `warning` colour — unassigned jobs are the dispatcher's main scan target.
- Radius `RADIUS.md` (12), shadow `SHADOWS.sm` — unchanged. Remove the card gradient washes if they cost contrast in sunlight (verify on device at 50% brightness).
- **Acceptance:** card height ≤ 132dp; all text AA contrast in both themes; status discernible from border alone at arm's length.

### 3.4 Semantic status colours (P0, small)

Replace the index-cycled `STATUS_FALLBACK_COLOURS` with name-keyword mapping (statuses are site-configurable, so match case-insensitively on substrings), falling back to the cycle:

| Keyword match | Colour | Token |
|---|---|---|
| pending, new, open | `#6B7280` slate | `statusNeutral` |
| assigned, accepted, claimed | `#2563EB` blue | `statusInfo` |
| transit, route, progress, collected, picked | `#ED6C02` orange | `statusActive` |
| delivered, completed, done | `#2E7D32` green | `statusDone` |
| cancelled, failed, rejected | `#D32F2F` red | `statusProblem` |

Add these 5 as named tokens to `colours.ts` (light + dark variants). Keep them distinct from the brand green so "Delivered" ≠ "interactive".

### 3.5 Dark mode (P1 — but the highest user-value item for drivers)

- Convert `COLOURS` to `PALETTES = { light: {...}, dark: {...} }` with identical key sets. Dark palette spec (true-dark-adjacent, not pure black, to avoid OLED smear while driving):

| Token | Light (current) | Dark |
|---|---|---|
| background | `#FFFFFF` | `#0E1412` |
| surface | `#F2F5F4` | `#1A2420` |
| surfaceAlt | `#E8F5ED` | `#22332A` |
| border | `#D9E2DD` | `#2E3B35` |
| text | `#0D1D14` | `#E7EFEA` |
| textMuted | `#5F6F66` | `#9DAFA6` |
| primary | `#419E61` | `#5BC47D` (lighter for contrast on dark) |
| danger | `#D32F2F` | `#EF6B5E` |
| warning | `#ED6C02` | `#F5A146` |
| dangerSurface (new) | `#FDECEA` | `#3A1F1C` |
| successSurface (new) | `#E6F4EA` | `#1C3A26` |

- **Mechanism that preserves `StyleSheet.create`:** keep static StyleSheets for layout (spacing, radii, flex) and move *colour-bearing* styles to a `useTheme()` hook returning the palette; components apply colours via a second style entry (`[styles.card, { backgroundColor: t.surface }]`). Alternative (less churn): a `makeStyles(palette)` factory memoized per scheme. Either honours "no inline styles" in spirit — colours come from tokens, never literals.
- Mode setting: `system | light | dark`, persisted (plain preference — AsyncStorage/MMKV is fine, it's not sensitive), toggle row in Profile. Default `system`; set `userInterfaceStyle: "automatic"` in app.json; StatusBar style follows theme.
- Replace every hardcoded `#FDECEA` / `#E6F4EA` with the two new surface tokens above (also fixes the off-palette inconsistency in light mode).
- **Acceptance:** every screen passes AA contrast in both themes; no literal hex outside `colours.ts`.

### 3.6 Motion & haptics (P1 — restraint is the spec)

Drivers don't need delight; they need confirmation. Tight budget:

- **expo-haptics** (Expo-bundled): `notificationAsync(Success)` on status update confirmed & outbox flush success; `(Error)` on failed outbox item appearing; `impactAsync(Light)` on tab switch and sheet open. Nothing else.
- **Layout animation** for list changes: `LayoutAnimation`/`Animated` on tab switch and when sync inserts/removes cards — or `Reanimated` entering/exiting (`FadeIn`, 150ms) if Reanimated is added for bottom sheets (3.7). No spring physics, no parallax.
- Press feedback stays scale 0.98/0.99 (already good) — add `android_ripple` with `surfaceAlt` on cards for platform-native feel.
- Skeleton placeholders (simple opacity-pulsing grey blocks, 3 fake cards) replace the bare spinner during first sync list state.

### 3.7 Sheets & pickers polish (P1)

- Keep RN `Modal` (avoid the gesture-handler/reanimated dependency if 3.6 doesn't pull it in) but standardize a shared `components/shared/SheetContainer.tsx`: grabber handle (36×4dp, `border` colour, centered), `borderTopRadius: RADIUS.lg`, backdrop `rgba(0,0,0,0.4)` (light) / `rgba(0,0,0,0.6)` (dark), bottom inset padding. StatusPicker, DriverPicker, JobFilterSheet, SyncProblemsSheet all adopt it.
  - *Optional upgrade:* `@gorhom/bottom-sheet` v5 (New-Arch compatible, needs reanimated + gesture-handler from the Expo SDK) for swipe-to-dismiss. Nice, not necessary — decide once, apply to all sheets.
- **StatusPicker rows:** show the status colour dot per row + radio-style selection; 56dp row height.
- **DriverPicker rows:** availability dot (green/grey) + assigned-job count; disable-with-reason rather than hide drivers outside `can_assign_to` ("Not permitted for your account") — visible constraints beat invisible ones.
- **Native date pickers:** replace the typed `YYYY-MM-DD` TextFields in JobFilterSheet with `@react-native-community/datetimepicker` (Expo-compatible, New-Arch ✓) behind a Pressable field that displays the formatted date. This was already flagged as deferred in STATUS.md; it is the worst remaining input UX in the app. Keep "Clear" affordance per field.
- **Filter sheet additions:** quick presets row at top — `Today` · `This week` · `All` chips (one tap sets the date range); chip `borderRadius` raised to pill (999) per current chip conventions.

### 3.8 Job detail — action-forward layout (P1)

The driver's job detail is the app's cockpit. Changes:

- **Sticky bottom action bar** (above tab bar / inset): the single most likely action as a full-width primary button — `Update status` (driver) or `Assign driver` when unassigned (dispatcher). Scrolling content never hides the primary action. Secondary actions stay inline.
- **Header block:** ref + large status pill + service/vehicle line; "as of" staleness note moves directly under the status pill with a `clock-outline` icon.
- **Stops timeline:** upgrade StopList numbered badges to a proper vertical timeline (dot + connecting line, `border` colour; first stop dot = `statusActive`); per-stop scheduled time and ASAP flag are already in `stops_json` — show them right-aligned. Read-only (per-stop status updates remain out of scope §14).
- **Contact actions as buttons:** replace bare tappable text with 40dp icon-buttons (`phone-outline`, `email-outline`, `map-marker-outline`) in the customer card — bigger targets for gloved hands.
- Section headers keep the uppercase `label` style — it works.

### 3.9 Login & onboarding visual refresh (P2)

- Login hero: keep the dark gradient block; add the app icon/logotype mark (asset exists in `assets/`), tighten to a more compact banner so the form sits higher above the keyboard.
- Onboarding: add a "What you'll need" helper card (site URL + 2 credentials from the admin) with a `help-circle-outline` icon — see §6.
- Both screens already handle keyboard correctly; no structural change.

---

## 4. Performance Specification

From the performance audit — the architecture is already sound (event-driven sync, no polling, narrow live queries, Hermes, dayjs). Ranked actionable items:

| # | Priority | Change | File | Spec |
|---|---|---|---|---|
| P-1 | **High** | Memoize filtering | `app/(app)/jobs/index.tsx:41` | `const visibleJobs = useMemo(() => applyJobFilters(jobs, filters), [jobs, filters])` — currently re-filters the entire job set on every render. 2 lines. |
| P-2 | **High** | Cap/stage first-sync detail hydration | `constants/index.ts:16` | `MAX_DETAIL_HYDRATION = 0` (uncapped) → hydrate assigned + most-recent ~150 first, then continue in background batches on idle/subsequent syncs. Already assigned-first ordered; add the cap + continuation. Protects battery/data on 500+ job tenants (pre-release checklist item). |
| P-3 | Medium | `React.memo(JobCard)` + stable `onSelect` | `JobCard.tsx`, `JobList.tsx` | Cards re-render whenever the outbox map or sync state changes parent state. Memo + `useCallback` the select handler; pass primitive `outboxState` per item, not the whole Map. |
| P-4 | Medium | FlatList tuning | `JobList.tsx:31` | Add `windowSize={7}`, `maxToRenderPerBatch={8}`, `removeClippedSubviews`. (`estimatedItemSize` is a FlashList prop — only applies if migrating; FlatList equivalent is `getItemLayout`, feasible once card height is fixed post-redesign.) |
| P-5 | Medium | FlashList v2 migration (optional) | `JobList.tsx` | `@shopify/flash-list` v2 is New-Arch-native and a drop-in for this list shape. Only worth it if dispatcher tenants exceed ~300 jobs; measure first with the redesigned card. |
| P-6 | Low | Convert picker ScrollView→FlatList | `DriverPicker.tsx`, `StatusPicker.tsx` | Only matters for 50+ drivers; cheap to do while restyling rows (§3.7). |
| P-7 | Low | Memoize outbox `stateByJob` map | `hooks/useOutbox.ts:22` | `useMemo` over the live-query result. |

**Perception-of-performance** (often worth more than real ms): skeleton cards on first sync (§3.6), optimistic status pill update is already instant (outbox) — surface it with the success haptic so users *feel* it was instant.

**Measurement gate before/after:** `npx react-devtools` profiler on Jobs list scroll with 300 seeded jobs; first-sync wall-clock + request count on the DDEV tenant; cold-start to first card paint.

---

## 5. Accessibility Specification

Target: **WCAG 2.2 AA** equivalents for native. Current state is decent (roles/states on Button & tabs, 56dp buttons, font scaling not disabled, AA palette). Gaps and fixes:

### A11y-1 (P0) Labels on icon-only / glyph controls
- All back buttons: `accessibilityLabel="Go back"`, `accessibilityRole="button"` (`jobs/[id].tsx:109`, `home.tsx:55`, `customers/[id].tsx`, `drivers/[id].tsx`, + new icon back buttons from §3.1).
- Sync spinner: `accessibilityLabel="Syncing"` / `"Downloading job details, {n} of {m}"` on `SyncStatusIndicator.tsx:29`.
- Pending/failed badges: `accessibilityLabel="{n} updates waiting to sync"` / `"{n} updates failed, double-tap for details"`.
- Text-link Pressables ("Change site", Retry/Discard): `accessibilityRole="button"`.
- New rule (enforce in review): **every `Pressable` ships a role, and a label whenever its visible text isn't self-explanatory.**

### A11y-2 (P0) Status never colour-only
- Status pill always carries the name text (already true) — keep this invariant through the redesign; the coloured left border (§3.3) is *additional* signal, never the only one.
- Availability badges keep "Available"/"Unavailable" text alongside tint.

### A11y-3 (P1) Font scaling resilience
- Add `maxFontSizeMultiplier={1.5}` on dense single-line rows (card meta rows, badges, tab labels) and let titles/body scale freely — prevents layout explosion at 200% while honouring user scaling.
- Long addresses: raise `numberOfLines` to 2 on JobCard address; job detail shows full text (verify nothing in detail truncates).
- QA pass at Android font scale 1.3 and 2.0 on Jobs list, job detail, filter sheet.

### A11y-4 (P1) Announcements & focus
- `AccessibilityInfo.announceForAccessibility("Status updated to In Transit")` after confirmed status change; `"You're offline — showing saved data"` when OfflineBanner appears.
- Failed-sync banner on job detail: `accessibilityLiveRegion="polite"`.
- After a sheet closes from an action, focus returns naturally (Modal handles this) — verify with TalkBack in QA.

### A11y-5 (P1) Touch targets
- Minimum 44×44dp on all new icon buttons (contact actions §3.8 are 40dp visual + ≥4dp hitSlop = 48dp effective).
- Add `hitSlop={8}` to the Filter/Refresh toolbar buttons.

### A11y-6 (P2) Contrast hardening
- `offline` grey `#9E9E9E` banner: white text passes, but darken banner to `#757575` (light) for margin; dark theme uses `surfaceAlt` + text.
- Re-verify the tinted status pills (12% opacity backgrounds) hit 4.5:1 for their text in both themes.

### A11y-7 (P2) Haptics as redundant channel
- §3.6 haptics double as non-visual confirmation for drivers who can't look at the screen — wire success/error consistently across status update, claim, assign, retry.

---

## 6. In-Context Help Specification

Principle for this audience: **no tutorial videos, no multi-step overlays** — drivers onboard in a car park. Help must be glanceable, dismissible, and visible at the moment of need.

### H-1 (P0) First-run hint cards (not coach-mark overlays)
- A dismissible inline card at the top of the Jobs list on first launch (flag in app preferences), role-aware:
  - **Driver, decentralized:** "**Available** shows unclaimed jobs anyone can take. **My Jobs** is your work. Tap a job, then *Claim job* to take it."
  - **Driver, centralized:** "Jobs your dispatcher assigns to you appear here automatically. Pull down to refresh."
  - **Dispatcher:** "Tap any job to assign a driver or update its status. Use **Filter** to narrow by status, driver, or date."
- One card, `surfaceAlt` background, `lightbulb-outline` icon, ✕ dismiss (44dp). Never reappears after dismissal (per-site flag).

### H-2 (P0) Explain sync states where they appear
- `SyncProblemsSheet` already explains failures well — extend the pattern to *pending*: tapping the "N pending" badge opens a small sheet: "These changes are saved on your phone and will send automatically when you're back online. You don't need to do anything." (Today the pending badge is inert and unexplained.)
- First time an action is queued offline, show a one-time toast/snackbar: "Saved — will sync when online."

### H-3 (P1) Empty states that say what to do next
- Filtered-empty: add a **"Clear filters"** button inside the EmptyState (action, not just text).
- Driver "Available" tab empty: "No unclaimed jobs right now. New jobs appear here automatically — pull down to check."
- Customers/Drivers empty: "These come from your TransitTeam site. Add them in the WordPress admin."
- Extend `EmptyState` with optional `icon` and `action {label, onPress}` props.

### H-4 (P1) Field-level helper text
- Onboarding: persistent helper under the credentials fields — "Your administrator can find these under *TransitTeam → API* in WordPress." plus a "What's this?" expander describing each field.
- Filter date fields: solved structurally by native pickers (§3.7); until then keep format helper text below the field, not only in the label.

### H-5 (P2) Help & About section in Profile
- Rows: "How this app works" (one static screen: offline-first explained in 4 short paragraphs — your data, syncing, pending/failed, who sees what), "Contact your administrator" (mailto site admin if known), app version + active site.
- This is also where the theme toggle (§3.5) lives.

### H-6 (P2) Plain-language glossary at point of use
- Long-press (or info icon) on a status pill in job detail → small popover listing this site's statuses in order. Low priority; statuses are usually self-evident.

**Anti-pattern note:** avoid tooltips-on-hover idioms and multi-screen carousels; they don't survive gloves, sunlight, or 30-second engagement windows.

---

## 7. Server-Side Opportunities (for the WordPress plugin backlog — not app v1 blockers)

1. **`status_types.color`** — add a colour column + expose in `/configuration`; the app's badge resolver already prefers server colours, so this lights up per-tenant theming with zero app change.
2. **Per-stop status over REST** — `update_job_location_status` exists as AJAX; a REST equivalent would unlock per-stop progress (currently spec §14 out-of-scope *because* it's AJAX-only).
3. **Per-stop contact name/phone in `GET /jobs?id=`** — closes the US-016 gap noted in STATUS.md.
4. **Customer full address in `/customers/{id}`** — closes the M3 gap.
5. **Webhook → push relay** — the plugin already enriches webhooks with driver assignment; this is the natural feed for Option A (FCM) notifications if Option B polling proves insufficient.

---

## 8. Dependency Plan (all New-Arch verified before install per CLAUDE.md)

| Package | Purpose | Status |
|---|---|---|
| `@expo/vector-icons` | Icon system | Bundled with Expo — no install |
| `expo-haptics` | Confirmation haptics | Expo SDK package ✓ |
| `@react-native-community/datetimepicker` | Native date pickers | Expo-compatible, New-Arch ✓ |
| `react-native-reanimated` + `react-native-gesture-handler` | Only if adopting @gorhom/bottom-sheet | Expo SDK pinned versions, New-Arch ✓ — **optional** |
| `@gorhom/bottom-sheet` v5 | Swipeable sheets | New-Arch ✓ — **optional** |
| `@shopify/flash-list` v2 | Large-list perf | New-Arch-native — **only if measured need (P-5)** |

Run `npx expo-doctor` after each addition. Note `npm install` (not `expo install`) + `--legacy-peer-deps` per this project's install constraints.

---

## 9. Phased Roadmap

**Phase 1 — Modern look, zero new native deps (≈3–5 dev days)**
Icons (§3.1) · bottom tabs (§3.2) · job card redesign (§3.3) · semantic status colours (§3.4) · a11y labels A11y-1/2 · perf P-1, P-3, P-4 · help H-1, H-3.
*This phase alone closes most of the "dated" gap.*

**Phase 2 — Driver-critical (≈4–6 dev days)**
Dark mode (§3.5) · haptics + skeletons (§3.6) · sheet polish + native date pickers (§3.7) · job detail action bar + stops timeline (§3.8) · perf P-2 · a11y A11y-3/4/5 · help H-2, H-4.

**Phase 3 — Refinement (≈2–3 dev days)**
Login/onboarding refresh (§3.9) · Help & About screen H-5 · A11y-6/7 · optional bottom-sheet library / FlashList if measurements justify · H-6.

**Verification per phase:** `tsc --noEmit`, jest coverage floor (90/85/90/93), Maestro suite green (testIDs must survive refactors — tabs change navigation, so `01-launch`/role-hiding flows need selector updates), TalkBack pass on Jobs + Job detail, both themes screenshotted at font scale 1.0 and 1.3.

---

## 10. Explicitly Not Proposed (scope fence)

Per spec §14 and project standards: no embedded map, no per-stop status *updates*, no photo POD, no GPS tracking, no chat, no NativeWind/styled-components migration, no custom font (system fonts are correct for legibility + zero load cost), no Expo eject. All proposals run inside the existing offline-first read path — nothing above introduces an API-fetch-to-render.
