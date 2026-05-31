# Smoke Testing with Maestro (Android)

End-to-end smoke tests use [Maestro](https://maestro.dev). They drive the **real app** against the
**live test site** ([`tq-pro-teams-php8.ddev.site`](https://tq-pro-teams-php8.ddev.site)).

Flows (`.maestro/`):
- **`smoke.yaml`** — the M1 happy path: onboarding → login → jobs list → job detail → status update.
- **`offline.yaml`** — the offline-first promise (ROADMAP M1 exit criterion): go offline → list still
  renders from the local DB → queue a status change while offline → it auto-syncs on reconnect.
- **`subflows/auth.yaml`** — shared onboarding+login, invoked via `runFlow` by both flows above.

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

2. **Build + install the app:**
   ```powershell
   npx expo run:android   # debug build; installs com.transitteam.app on the emulator
   ```

3. **Run a flow.** Credentials are passed as env vars — **never commit them**:
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

- **DDEV reachability + TLS:** the emulator can't reach `*.ddev.site` without `adb reverse`, and
  HTTPS needs the mkcert CA trusted — see "Reaching the DDEV test site from the emulator" above.
- **Secrets:** keep them in your shell/`.env` (gitignored), CI secrets, or EAS env — never in
  `.maestro\*.yaml`. The flows only reference `${...}` placeholders.
- **Element targeting:** flows match by `testID` (`id:`) or visible text. When adding UI we target in
  a flow, add a stable `testID` rather than relying on copy.
- **First run is the real test:** Maestro now runs on Windows and the emulator is up, but the flows
  have **not** yet executed end-to-end against an installed build. Expect to iterate on
  selectors/timing on the first pass (needs `npx expo run:android` + the live credentials).
