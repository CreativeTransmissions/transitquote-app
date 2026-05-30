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
Windows host:  Android Studio emulator (AVD: Pixel_9)  +  adb server  +  expo run:android (build)
                                   ▲ ADB (TCP)
WSL2 (Ubuntu): maestro test  ──────┘
```

Only the *runner* crosses the boundary. **The build always happens on Windows.** The one-time cost
is bridging ADB from WSL2 to the Windows adb server — see step 1.

> **This machine's verified state (2026-05-30):** the available AVD is **`Pixel_9`**. WSL2 has
> **openjdk 25** + **Maestro 1.44.0** installed via Homebrew/installer and persisted in `~/.bashrc`.
> The bridge is configured via **mirrored networking** (`C:\Users\andre\.wslconfig` written) — apply
> it with `wsl --shutdown`. The TCP fallback (below) was found to be **blocked by Windows Firewall**
> on this machine, so mirrored networking is the path here.

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
adb -a -P 5037 nodaemon server   # bind adb to all interfaces (leave running)
```

In **WSL2**, point the adb client at the Windows host IP (the default gateway in NAT mode):

```bash
export ADB_SERVER_SOCKET=tcp:$(ip route show default | awk '{print $3}'):5037
adb devices
```

> ⚠️ **Firewall:** on this machine, WSL2→Windows:5037 was **blocked by Windows Defender Firewall**
> (NAT mode). Option B therefore needs a one-time inbound rule — run, from an **elevated** PowerShell:
> `powershell -ExecutionPolicy Bypass -File scripts\adb-bridge-firewall.ps1`. Because that requires
> admin, **Option A (mirrored networking) is preferred here** — it shares localhost and needs no rule.

### 2. Install Maestro + Java in WSL2

```bash
# Java (a JRE 11+ is required to run Maestro). Via Homebrew (no sudo) or apt:
brew install openjdk                                  # or: sudo apt-get install -y openjdk-17-jre
curl -Ls "https://get.maestro.mobile.dev" | bash     # installs Maestro to ~/.maestro/bin
maestro --version
```

> Already done on this machine: openjdk 25 + Maestro 1.44.0, with `JAVA_HOME`/PATH persisted in
> `~/.bashrc`. `maestro` is **not** a Homebrew formula — use the installer script above.

---

## Per-run loop

1. **Build + install on Windows** (Git Bash / PowerShell) onto the running emulator:

   ```bash
   # Boot the emulator first if needed:
   ~/AppData/Local/Android/Sdk/emulator/emulator -avd Pixel_9 &
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

   Swap `.maestro/smoke.yaml` for `.maestro/offline.yaml` to run the offline flow.
   (`npm run e2e` runs `maestro test .maestro` — i.e. every flow — once the env vars are exported.)

---

## Offline flow — network control

`offline.yaml` uses **`toggleAirplaneMode`** (Android-only), the broadly-available command. It is a
**relative toggle**, so the flow assumes it **starts online**: run it on a freshly-booted/online
emulator (1st toggle → offline, 2nd → online).

- ⚠️ If the flow aborts while offline, the device stays offline — re-enable the network or reboot
  the emulator before the next run.
- Newer Maestro versions may support the absolute `setAirplaneMode: Enabled|Disabled`. If yours does,
  prefer it (deterministic regardless of starting state) and add an `onFlowComplete` that forces the
  network back on. The flow header documents the exact swap.

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
