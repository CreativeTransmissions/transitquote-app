# emulator-bridge.ps1 — unblock the emulator for E2E against the local DDEV test site.
#
# THE PROBLEM: *.ddev.site is a real public domain that resolves to 127.0.0.1. Inside the
# emulator that points at the emulator's OWN loopback (nothing listening), and DDEV rejects a
# wrong Host header, so you can't just use 10.0.2.2. THE FIX (no root needed): `adb reverse`
# forwards the emulator's 127.0.0.1:PORT to the HOST's 127.0.0.1:PORT, landing requests on the
# host's DDEV router with the correct hostname + Host header intact.
#
# This is the simpler alternative to creating a rootable AVD + editing /system/etc/hosts.
#
# Usage (from a terminal where adb is on PATH):
#   ./scripts/emulator-bridge.ps1                 # boot Pixel_9 if needed, set up reverse ports
#   ./scripts/emulator-bridge.ps1 -Avd Pixel_9    # explicit AVD name
#   ./scripts/emulator-bridge.ps1 -NoBoot         # assume an emulator is already running
#
# After it prints OK, the app (debug build) can reach https://tq-pro-teams-php8.ddev.site.
# HTTPS also requires the app to trust the mkcert CA — see docs/SMOKE_TESTING.md.

param(
  [string]$Avd = "Pixel_9",
  [switch]$NoBoot
)

$ErrorActionPreference = "Stop"
$SiteHost = "tq-pro-teams-php8.ddev.site"

function Wait-ForDevice {
  Write-Host "Waiting for an emulator to come online..."
  adb wait-for-device | Out-Null
  # Block until the OS finishes booting (sys.boot_completed == 1).
  do {
    Start-Sleep -Seconds 2
    $booted = (adb shell getprop sys.boot_completed 2>$null).Trim()
  } while ($booted -ne "1")
  Write-Host "Emulator booted."
}

if (-not $NoBoot) {
  $running = (adb devices) -match "emulator-\d+\s+device"
  if (-not $running) {
    $emu = Join-Path $env:LOCALAPPDATA "Android\Sdk\emulator\emulator.exe"
    if (-not (Test-Path $emu)) { throw "emulator.exe not found at $emu — check ANDROID_HOME." }
    Write-Host "Booting AVD '$Avd'..."
    Start-Process -FilePath $emu -ArgumentList "-avd", $Avd | Out-Null
  } else {
    Write-Host "An emulator is already running."
  }
}

Wait-ForDevice

# Forward the emulator's loopback to the host's loopback for both TLS and plain HTTP.
adb reverse tcp:443 tcp:443 | Out-Null
adb reverse tcp:80  tcp:80  | Out-Null
Write-Host "adb reverse set: emulator 127.0.0.1:443/:80 -> host 127.0.0.1:443/:80"
adb reverse --list

# Sanity check: can the emulator reach the DDEV router with the right Host header?
Write-Host "`nProbing https://$SiteHost from inside the emulator..."
$code = (adb shell "curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://$SiteHost/" 2>$null)
if ($code) {
  Write-Host "  HTTP status: $code  (a 2xx/3xx/4xx means the connection + TLS worked; 000 = not reachable/TLS untrusted)"
} else {
  Write-Host "  (device curl unavailable or TLS not yet trusted — the app may still work; see SMOKE_TESTING.md)"
}

Write-Host "`nReady. Now build + install, then run a flow:" -ForegroundColor Green
Write-Host "  npx expo run:android"
Write-Host "  maestro test ``"
Write-Host "    -e SITE_URL=https://$SiteHost ``"
Write-Host "    -e CLIENT_ID=<client_id> -e CLIENT_SECRET=<client_secret> ``"
Write-Host "    -e TQ_USERNAME=api-driver -e TQ_PASSWORD=<password> ``"
Write-Host "    .maestro\smoke.yaml"
Write-Host "`nNote: adb reverse is cleared when the emulator reboots or adb restarts — re-run this script."
