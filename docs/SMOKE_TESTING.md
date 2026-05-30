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

## Topology — where things run

This repo is developed on **Windows**, where the emulator, Android SDK, `adb`, JDK, and the app
build all live. Maestro itself is Unix-first, so the **Maestro runner lives in WSL2** and talks to
the **emulator on the Windows host** over ADB.

```
Windows host:  Android Studio emulator (Pixel_8_Pro_API_34)  +  adb server  +  expo run:android (build)
                                   ▲ ADB (TCP)
WSL2:          maestro test  ──────┘
```

Only the *runner* crosses the boundary. **The build always happens on Windows.** The one-time cost
is bridging ADB from WSL2 to the Windows adb server — see step 1.

---

## One-time setup

### 1. Bridge ADB from WSL2 to the Windows emulator

**Option A — mirrored networking (recommended, Windows 11 22H2+).** Shares `localhost` between
Windows and WSL2, so WSL2 reaches the Windows adb server directly. In `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
networkingMode=mirrored
```

Then `wsl --shutdown` (from Windows) and reopen WSL2. Verify from WSL2:

```bash
adb connect localhost:5555   # or: export ADB_SERVER_SOCKET=tcp:localhost:5037
adb devices                  # should list the running emulator
```

**Option B — share the adb server over TCP (any Windows/WSL2 version).** On **Windows**:

```powershell
adb kill-server
adb -a -P 5037 nodaemon-server   # bind adb to all interfaces (leave running)
```

In **WSL2**, point the adb client at the Windows host IP (from `/etc/resolv.conf`):

```bash
export ADB_SERVER_SOCKET=tcp:$(grep nameserver /etc/resolv.conf | awk '{print $2}'):5037
adb devices
```

### 2. Install Maestro + Java in WSL2

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash   # installs to ~/.maestro/bin
sudo apt-get install -y openjdk-17-jre               # Maestro requires a JRE
maestro --version
```

---

## Per-run loop

1. **Build + install on Windows** (Git Bash / PowerShell) onto the running emulator:

   ```bash
   npx expo run:android        # debug build; installs com.transitteam.app on the emulator
   ```

   For a release-like check, an EAS internal APK also works:
   `eas build -p android --profile preview` → install the APK with `adb install`.

2. **Run the smoke flow from WSL2.** Credentials are passed as env vars — **never commit them**:

   ```bash
   maestro test \
     -e SITE_URL=https://tq-pro-teams-php8.ddev.site \
     -e CLIENT_ID=<client_id> \
     -e CLIENT_SECRET=<client_secret> \
     -e TQ_USERNAME=api-driver \
     -e TQ_PASSWORD=<password> \
     .maestro/smoke.yaml
   ```

   (`npm run e2e` runs `maestro test .maestro` once the env vars are exported in your shell.)

---

## Notes & gotchas

- **DDEV TLS:** the test site uses a local self-signed cert. The app's axios client must trust it in
  dev, or point `SITE_URL` at the DDEV `http://` origin if the API is reachable without TLS.
- **Secrets:** keep them in your shell/`.env` (gitignored), CI secrets, or EAS env — never in
  `.maestro/*.yaml`. The flow only references `${...}` placeholders.
- **Element targeting:** flows match by `testID` (`id:`) or visible text. When adding UI we target in a
  flow, add a stable `testID` rather than relying on copy.
- **First run is the real test:** this scaffold is verified by typecheck/lint but has **not** yet run
  on the emulator. Expect to iterate on selectors/timing on the first pass.
