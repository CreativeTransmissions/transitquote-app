# Smoke Testing with Maestro (Android)

End-to-end smoke tests use [Maestro](https://maestro.dev). They drive the **real app** against the
**live test site** ([`tq-pro-teams-php8.ddev.site`](https://tq-pro-teams-php8.ddev.site)).

Flows (`.maestro/`):
- **`minimal.yaml`** — smallest possible check: launch the app and assert the first screen renders
  ("Connect your site" + the site-URL field). **No network, no auth, no creds.** Run this FIRST —
  it isolates "the JS bundle loads and React renders" from every other concern. ✅ **Verified passing
  2026-05-31** (exit 0, all steps COMPLETED) on the embedded-bundle build (see step 2 below).
- **`smoke.yaml`** — the M1 happy path: onboarding → login → jobs list → job detail → status update.
- **`offline.yaml`** — the offline-first promise (ROADMAP M1 exit criterion): go offline → list still
  renders from the local DB → queue a status change while offline → it auto-syncs on reconnect.
- **`subflows/auth.yaml`** — shared onboarding+login, invoked via `runFlow` by `smoke`/`offline`.

> **Status (2026-05-31):** ALL flows green on the embedded-bundle build (exit 0) — `minimal`, the
> `steps/01`→`05` ladder, `smoke.yaml`, and `offline.yaml`. See the full status section at the bottom.

> **Why Maestro (not Detox)?** Maestro is black-box (drives the app over ADB, no native
> instrumentation/build hooks), which suits Expo + RN 0.85 New Architecture. It needs only a
> `testID` on each element we target. This supersedes the Detox plan in the global standards.

---

## Topology — native Windows

Everything runs on **Windows**: the emulator, Android SDK, `adb`, the JDK, the app build, **and
Maestro itself**. Maestro has a native Windows CLI, so there is **no WSL2 and no ADB bridge** — the
simplest setup, and the one in use on this machine.

> A WSL2 runner was evaluated and rejected: Maestro's own docs call WSL setup complex, the WSL2→host
> ADB bridge was blocked by Windows Firewall here, and WSL had no JDK (and no passwordless sudo to
> add one). Native Windows reuses the existing Windows JDK 17 + adb + emulator. (The leftover
> `C:\Users\<you>\.wslconfig` and `scripts/adb-bridge-firewall.ps1` only matter if you revisit WSL.)

---

## Verified state on this machine (2026-05-30)

- **Emulator:** AVD **`Pixel_9`** (note: not the `Pixel_8_Pro_API_34` named in older docs). Boots as
  `emulator-5554`.
- **JDK:** Temurin/Adoptium **JDK 17** at
  `C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot` (Maestro needs Java 17+).
- **Maestro:** **2.6.0**, installed to `C:\maestro` (binary at `C:\maestro\bin\maestro.bat`).
  Verified with `maestro -v` → `2.6.0`.
- **Env (persisted via `setx`, applies to NEW terminals):** `JAVA_HOME`, `ANDROID_HOME`
  (`C:\Users\<you>\AppData\Local\Android\Sdk`), and PATH additions for `C:\maestro\bin` + SDK
  `platform-tools`.

---

## One-time setup (already done here — for a fresh machine)

1. **Install JDK 17+** (Temurin recommended) and set `JAVA_HOME`.
2. **Install Maestro (native Windows):**
   ```powershell
   # Download the latest release and extract so maestro.bat ends up at C:\maestro\bin\maestro.bat.
   # The zip nests a top-level 'maestro\' folder — move that inner folder to C:\maestro.
   curl -L --ssl-no-revoke -o "$env:TEMP\maestro.zip" `
     https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip
   Expand-Archive "$env:TEMP\maestro.zip" -DestinationPath "$env:TEMP\maestro-x" -Force
   Move-Item "$env:TEMP\maestro-x\maestro" C:\maestro
   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot"
   setx ANDROID_HOME "$env:LOCALAPPDATA\Android\Sdk"
   setx PATH "%PATH%;C:\maestro\bin;%LOCALAPPDATA%\Android\Sdk\platform-tools"
   ```
   > `--ssl-no-revoke` works around a Windows schannel certificate-revocation-check failure when
   > downloading from GitHub (`CRYPT_E_NO_REVOCATION_CHECK`). It keeps certificate verification on.

   Open a **new** terminal, then verify: `maestro -v` → `2.6.0`.

---

## Reaching the DDEV test site from the emulator (the unblock)

**The problem.** `*.ddev.site` is a real public domain that resolves to `127.0.0.1`. Inside the
emulator that points at the **emulator's own loopback** (nothing listening there), so the app can't
reach the API. You can't simply swap in `10.0.2.2` (the host alias) either, because DDEV routes by
**Host header** and rejects a mismatched host (verified: wrong host → 404).

**`adb reverse` does NOT work on this machine.** It was the original plan, but its **return path is
broken** here (proven 2026-05-31 with a trivial host server: the emulator's outbound connection
reaches the host, but no response is ever relayed back — likely a Docker-Desktop/WSL2 loopback
interaction). Do not rely on it. `scripts/emulator-bridge.ps1` is kept only for reference.

**The fix that works — host DNS responder + the `10.0.2.2` NAT path (no root, keeps the https
hostname).** The emulator reaches the host reliably only via the QEMU NAT alias `10.0.2.2`. So:
1. Run the DNS responder (maps `*.ddev.site → 10.0.2.2`, forwards everything else). Leave it running:
   ```bash
   node scripts/emulator-ddev-dns.js          # binds 127.0.0.1:53
   ```
2. Boot the emulator pointed at it (see the per-run loop). The app keeps the real
   `https://tq-pro-teams-php8.ddev.site` URL — only the IP it resolves to changes — so SNI/Host are
   correct, DDEV serves its mkcert cert, and the bundled CA validates.
> ⚠️ **Avast must not filter DNS.** Avast's Web Shield / "Real Site" silently drops UDP-53 replies on
> loopback (verified: port 9953 round-trips, port 53 doesn't). Turn Web Shield OFF for the run, or the
> DNS responder's answers never arrive. Avast also MITMs HTTPS (see build notes) — Web Shield OFF
> fixes both. Re-enable it afterwards.

**HTTPS trust (mkcert).** DDEV serves TLS with a **mkcert** certificate, which Android (API 24+)
won't trust by default. Two pieces make `https://` work in **debug** builds:
1. The `withDevNetworkSecurity` config plugin (in `app.json`) emits a `network_security_config.xml`
   with `<debug-overrides>` trusting **system + user CAs** (and a bundled CA if present). It only
   affects debuggable builds; release TLS is untouched. It re-applies on every `expo prebuild`.
2. The mkcert root CA must be available to the app, via **either**:
   - **Install on the emulator** (no repo changes): get the CA (`mkcert -CAROOT` → `rootCA.pem`, or
     export DDEV's CA), `adb push` it, then add it via *Settings → Security → Encryption &
     credentials → Install a certificate → CA certificate*. The plugin's `user` trust anchor covers it.
   - **Bundle for CI/determinism**: drop the CA at `certs/ddev-rootCA.pem` (gitignored) and
     `expo prebuild` — the plugin copies it to `res/raw` and trusts it directly.

> ⚠️ **mkcert is not currently installed on this machine** and no `certs/ddev-rootCA.pem` exists, so
> the CA must be obtained once before the first HTTPS run. (Plain `http://` via `adb reverse tcp:80`
> needs no CA, if DDEV serves the API without a redirect to https.)

**Fallback — rootable AVD + hosts edit.** Only if `adb reverse` can't be used. Needs `sdkmanager`
(not on PATH here), a non-Play-store image (`sdkmanager "system-images;android-37;google_apis;x86_64"`,
~1.5 GB), a fresh AVD booted with `-writable-system`, then `adb root && adb remount` and add
`10.0.2.2  tq-pro-teams-php8.ddev.site` to `/system/etc/hosts`. The current `Pixel_9` AVD is a
**Play-store image** (`tag.id=google_apis_playstore`), which is non-rootable — hence the fallback
needs a new AVD.

---

## Per-run loop

1. **Start the DNS responder, then boot the emulator pointed at it** (credentialed/API flows only;
   `minimal.yaml` and `steps/01-launch.yaml` need none of this):
   ```bash
   # (a) DNS responder — leave running (maps *.ddev.site -> 10.0.2.2). Avast Web Shield must be OFF.
   node scripts/emulator-ddev-dns.js &
   # (b) Boot the emulator USING that resolver (fresh state):
   "$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd Pixel_9 -dns-server 127.0.0.1 -no-snapshot-load &
   adb wait-for-device                    # then wait for sys.boot_completed == 1
   # (c) Verify the guest resolves the host: should print 10.0.2.2
   adb shell ping -c1 tq-pro-teams-php8.ddev.site
   # (d) Suppress the "Try out your stylus" keyboard popup — it steals focus and breaks text input:
   adb shell settings put secure stylus_handwriting_enabled 0
   ```
   > `adb reverse` is NOT used (its relay is broken here — see the bridge section). The `-dns-server`
   > value is read from the HOST's perspective, so `127.0.0.1` = the responder on the host loopback.

2. **Build + install the app — with the JS bundle EMBEDDED (required for Maestro).**

   ⚠️ **Why embed:** this project has **no `expo-dev-client`**, so a plain `npx expo run:android`
   debug build ships no bundled JS and depends on a live Metro connection. On this machine Avast
   blocks the emulator→Metro path, and Maestro's `clearState` wipes the saved dev-server URL — so the
   app shows the red **"Unable to load script"** screen and every flow fails at the first assert.
   Embedding the production bundle makes the app load its own JS: no Metro needed, survives `clearState`.

   ```powershell
   # Point Gradle at the Avast-patched truststore (see Environment notes).
   $env:JAVA_TOOL_OPTIONS = "-Djavax.net.ssl.trustStore=$env:USERPROFILE\.tqapp-certs\cacerts -Djavax.net.ssl.trustStorePassword=changeit"

   # (a) Apply config plugins (TLS network-security-config + bundled mkcert CA) into android/.
   npx expo prebuild -p android

   # (b) Generate the embedded JS bundle into the debug APK's assets.
   npx expo export:embed `
     --platform android --dev false --entry-file index.ts `
     --bundle-output android/app/src/main/assets/index.android.bundle `
     --assets-dest android/app/src/main/res

   # (c) Build the debug APK (now contains assets/index.android.bundle) and install it.
   cd android; ./gradlew assembleDebug; cd ..
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```
   Verify the bundle made it in: `unzip -l <apk> | grep index.android.bundle` (≈2 MB entry).

   > Re-run (b)+(c) whenever JS changes — the embedded bundle is a build-time snapshot. A future
   > improvement is a single bundled APK profile so this is one command.

3. **Run the minimal flow first (no creds needed)** — confirms the build renders before involving
   the API:
   ```powershell
   maestro test .maestro\minimal.yaml
   ```
   Expect every step `COMPLETED` and exit 0. If this fails, the build/bundle is broken — fix that
   before touching the credentialed flows.

4. **Run a credentialed flow.** Credentials are passed as env vars — **never commit them**. Source
   them from the gitignored creds file (see [Credentials](#credentials)) rather than typing them:
   ```powershell
   maestro test `
     -e SITE_URL=https://tq-pro-teams-php8.ddev.site `
     -e CLIENT_ID=<client_id> `
     -e CLIENT_SECRET=<client_secret> `
     -e TQ_USERNAME=api-driver `
     -e TQ_PASSWORD=<password> `
     .maestro\smoke.yaml
   ```
   Swap `smoke.yaml` for `offline.yaml` to run the offline flow. `npm run e2e` runs every flow in
   `.maestro\` once the env vars are set in your shell.

   > A credentialed flow also needs the DDEV bridge from the previous section: `adb reverse`
   > (tcp:443/:80) + the mkcert CA trusted via the `withDevNetworkSecurity` plugin. `minimal.yaml`
   > needs none of that.

---

## Offline flow — network control

`offline.yaml` uses **`toggleAirplaneMode`** (Android-only), the broadly-available command. It is a
**relative toggle**, so the flow assumes it **starts online**: run it on a freshly-booted/online
emulator (1st toggle → offline, 2nd → online).

- ⚠️ If the flow aborts while offline, the device stays offline — re-enable the network or reboot
  the emulator before the next run.
- Maestro 2.x may support the absolute `setAirplaneMode: Enabled|Disabled` (deterministic regardless
  of starting state) plus an `onFlowComplete` safety net. The flow header notes the swap.

---

## Notes & gotchas

- **⚠️ Never put an `env:` block with empty defaults in a flow.** In Maestro 2.6.0, an in-flow
  `env: { SITE_URL: "" }` default **overrides** the `-e` CLI value (the `""` wins), so `${SITE_URL}`
  resolves to empty, **nothing gets typed**, and `assertVisible: "${SITE_URL}"` becomes
  `assertVisible: ""` which **passes trivially** — a silent false-green that looks like an input bug.
  Pass values ONLY via `-e`; document required vars in a comment, not an `env:` block.
  (Diagnosed 2026-05-31 — this was the real cause of "text isn't being entered".)
- **⚠️ The "Try out your stylus" keyboard popup breaks text input.** Android shows a one-time
  stylus-handwriting promo in the keyboard area; it steals focus from the field so `inputText` lands
  nowhere (the read-back assert then fails), and a stray dismiss tap can back you out to the home
  screen. Suppress it: `adb shell settings put secure stylus_handwriting_enabled 0` (persists until
  the AVD is wiped).
- **⚠️ Dismiss the keyboard between fields with a blank-area tap, NOT `hideKeyboard`.** On Android
  Maestro implements `hideKeyboard` as a BACK press, which from a root screen (onboarding/login)
  EXITS the app (process dies → home screen). The subflows tap a blank upper area (`point: 50%,10%`)
  to blur the field + dismiss the keyboard via the form's `keyboardShouldPersistTaps="handled"`.
- **⚠️ Maestro can leave the device's IME on its own non-rendering keyboard** after an aborted run,
  so you can no longer type (manually or via a flow) and text silently fails to appear. Fix:
  `adb shell ime reset` (restores the default keyboard). Run it at the start of a session if input
  misbehaves; consider adding it to the per-run loop.
- **Soft keyboard obscures lower fields.** The auth forms centre their content, so with the keyboard
  open the lower fields (Client Secret, Password) sit under it; tapping an obscured field doesn't
  focus it and the next `inputText` leaks into the field above. The subflows therefore `hideKeyboard`
  between fields and settle (`waitForAnimationToEnd`) before submitting.
- **DDEV reachability + TLS:** the emulator can't reach `*.ddev.site` without `adb reverse`, and
  HTTPS needs the mkcert CA trusted — see "Reaching the DDEV test site from the emulator" above.
- **Secrets:** keep them in your shell, a gitignored env file, CI secrets, or EAS env — never in
  `.maestro\*.yaml`. The flows only reference `${...}` placeholders.
- **Element targeting:** flows match by `testID` (`id:`) or visible text. When adding UI we target in
  a flow, add a stable `testID` rather than relying on copy.
- **Verification discipline:** a flow PASSES only when every step prints `COMPLETED` **and** the run
  exits 0 — read the actual Maestro output, not just a wrapper/exit code. Maestro can report a
  step-level `FAILED` while the surrounding shell still exits 0.

## Credentials

All live test credentials (3 role logins **and** the OAuth `client_id`/`client_secret`) live in one
file in the WSL DDEV site root, **outside this repo**:

```
/home/andrew/projects/tq-pro-teams-php8/TEST_USERS.md   # read: wsl -d Ubuntu -e bash -lc 'cat …'
```

For convenience the per-run loop can source a **gitignored** env file (e.g. `.api-samples/e2e.env`,
covered by the `.api-samples/` ignore) holding `SITE_URL`/`CLIENT_ID`/`CLIENT_SECRET`/`TQ_USERNAME`/
`TQ_PASSWORD`. The mkcert root CA (DDEV's TLS signer) is in WSL at
`/home/andrew/.local/share/mkcert/rootCA.pem`; a copy is staged for the build at
`certs/ddev-rootCA.pem` (gitignored). Verified round-trip working 2026-05-31.

## Current status (2026-05-31)

- ✅ App **builds, installs, and renders** on the `Pixel_9` emulator (embedded-bundle debug APK).
- ✅ `minimal.yaml` passes (launch + first-screen asserts, exit 0).
- ✅ **`steps/01-launch.yaml`** — launch + onboarding renders (exit 0).
- ✅ **`steps/02-onboarding.yaml`** — onboarding form → login screen, exit 0, verified reproducible.
  Required the env-block fix + IME reset + hideKeyboard-between-fields (see Notes & gotchas).
  Run with `-e SITE_URL=… -e CLIENT_ID=… -e CLIENT_SECRET=…` (dummy values are fine — onboarding
  only validates+saves locally, no API call until login/step 3).
- ✅ **`steps/03-login.yaml`** — real OAuth login → `GET /configuration` → lands on the **Jobs** list,
  exit 0, verified reproducible. Required: the DNS responder (`scripts/emulator-ddev-dns.js`) + emulator
  booted with `-dns-server 127.0.0.1` (adb reverse is broken here), Avast Web Shield OFF, stylus popup
  disabled, the `login → /jobs` routing fix, and the blank-tap keyboard dismiss. Run with all five
  `-e` vars (SITE_URL + client id/secret + TQ_USERNAME/PASSWORD).
- ✅ **`steps/04-job-detail.yaml`** — auth → open first job → job detail renders (read path), exit 0.
- ✅ **`steps/05-status-update.yaml`** — auth → open job → update status → back to list, exit 0.
  ⚠️ MUTATES a test job's status on the live DDEV site.
- ✅ **`smoke.yaml`** — the combined M1 happy path (= step 05 end to end), exit 0. ⚠️ MUTATES a job.
- ✅ **`offline.yaml`** — the offline-first promise verified end to end, exit 0: go offline → banner
  ("Offline — showing data from …") + list still renders from the local DB → queue a status update
  ("↻ Pending sync" on the card) → reconnect → banner + pending-sync clear (outbox auto-flush) → Jobs.
  ⚠️ MUTATES a job and toggles airplane mode (left online after). **Fix applied 2026-05-31:** the four
  text matchers were exact strings (`"Offline"`, `"Pending sync"`) but Maestro matches the WHOLE element
  text, so they never matched the real banner/card copy — the two `notVisible` checks were silent
  false-greens. Now regex (`"Offline.*"`, `".*Pending sync"`). App behaviour was correct throughout.

> **Two operational gotchas hit while running 04/05/offline (2026-05-31):**
> 1. **First flow after a cold emulator boot flakes** with `io.grpc … UNAVAILABLE / Command failed
>    (tcp:…): closed` on the first `viewHierarchy` after `clearState` — the Maestro driver channel
>    isn't ready. Just re-run; let the device settle (~8s, dismiss keyguard) first.
> 2. **"Unable to launch app" between runs** = an **orphaned Maestro `java.exe`** on the host holding
>    the driver connection. `adb kill-server && adb start-server` sometimes clears it; the reliable
>    fix is `taskkill /PID <java.exe> /F` (the app itself launches fine via `adb shell monkey`, which
>    proves it's a Maestro-side wedge, not an app crash). Then re-run.

## New flows (2026-06-03) — authored, pending an emulator run

These were added to close the recommended E2E gaps. YAML validated (all 17 `.maestro` flows parse);
they have **not** yet been executed here (no emulator was running at authoring time). Run them with
the per-run loop above.

- **`roles.yaml`** — role-based UI hiding (CLAUDE.md §4 + Testing Standards): a **driver** must NOT
  see the dispatcher-only Drivers/Customers links. Deterministic. Run with **api-driver**.
- **`assign-driver.yaml`** — dispatcher assigns a driver from job detail (Assign → pick → confirm).
  Deterministic. Run with **api-dispatch**. ⚠️ MUTATES a job's assignment on the live DDEV site.

## E2E coverage gaps — NOT auto-testable from Maestro alone

These three recommended scenarios can't be made deterministic with Maestro + the live site alone,
because each needs a precondition Maestro can't create. Documented here rather than shipped as
fragile/false-green flows. Each is covered at the unit/integration level (see the Jest suite).

- **Outbox failed → retry/discard** (SyncProblemsSheet / job-detail failed banner). Needs the server
  to *reject* a queued action (4xx or 200+`success:false`) to produce a `failed` outbox row. There's
  no reliable way to force a rejection from the UI on demand. *Unit-covered:* `outboxFlusher`
  failure classification, `useOutboxActions` retry/discard, `SyncProblemsSheet` + job-detail banner.
  To test manually: seed a `failed` outbox row (or point at a server stub that 4xx's the write),
  then drive `sync-failed-badge → sync-problem-retry-* / -discard-*`.
- **Multi-site switch.** Needs a **second real tenant** (URL + client creds + login). The add-a-site
  path is login → "Change site" → onboarding, which is only reachable after logout — and logout
  clears the *active* site's token, so a switch to the other site correctly lands on its login
  screen (re-auth), not Jobs. Parameterise with a second `_2` env set if a second site is available.
  *Unit-covered:* `useSites` (load / wipe-then-switch / no-op), `authStore` (`saveSiteConfig`,
  `switchSite` token→status), home switcher rows.
- **401 → forced re-login.** Needs an invalidated/expired access token to provoke a 401; the token
  lives in the Android keystore (expo-secure-store) and can't be tampered with from Maestro.
  *Unit-covered:* `apiClient` 401 interceptor → `clearSession`, and the `(app)` layout redirect to
  `/login` when unauthenticated.
