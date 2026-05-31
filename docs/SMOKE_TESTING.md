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

> **Status (2026-05-31):** `minimal.yaml` is green. `smoke.yaml` / `offline.yaml` have not yet been
> confirmed green on the embedded-bundle build — run and verify before claiming they pass.

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

**The fix — `adb reverse` (no root, recommended).** `adb reverse` forwards a port on the
**emulator's** `127.0.0.1` to the **host's** `127.0.0.1`. Because the app already resolves the DDEV
name to `127.0.0.1`, requests land on the host's DDEV router with the correct hostname **and** Host
header — no hosts-file edit, no rootable AVD.

```powershell
./scripts/emulator-bridge.ps1     # boots Pixel_9 if needed, then sets the reverse ports
# equivalent manual step, with the emulator running:
adb reverse tcp:443 tcp:443
adb reverse tcp:80  tcp:80
```
> `adb reverse` is cleared on emulator reboot / adb restart — re-run the script each session.

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

1. **Boot the emulator + bridge** (if not already running):
   ```powershell
   ./scripts/emulator-bridge.ps1          # boots Pixel_9, sets adb reverse, prints the maestro line
   # or manually:
   & "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -avd Pixel_9
   adb devices                            # should list emulator-5554
   adb reverse tcp:443 tcp:443; adb reverse tcp:80 tcp:80
   ```

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
- ⏳ **`steps/03-login.yaml`** and beyond (04/05, `smoke.yaml`, `offline.yaml`) — first rungs that hit
  the API. Need real `-e TQ_USERNAME`/`TQ_PASSWORD` (+ client creds) + the DDEV bridge (adb reverse +
  mkcert CA). Env-block fix already applied; run one rung at a time and confirm `COMPLETED` + exit 0.
