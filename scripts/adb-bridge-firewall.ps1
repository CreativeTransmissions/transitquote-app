# Allows WSL2 -> Windows adb server (port 5037) through Windows Defender Firewall.
# Use this ONLY if you keep WSL2 in the default (NAT) networking mode instead of mirrored.
# Run from an ELEVATED PowerShell:  powershell -ExecutionPolicy Bypass -File scripts\adb-bridge-firewall.ps1
#
# With mirrored networking (recommended, via ~/.wslconfig) you do NOT need this — delete the rule
# afterwards with:  Remove-NetFirewallRule -DisplayName "WSL2 adb bridge (5037)"

$ruleName = "WSL2 adb bridge (5037)"
if (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue) {
  Write-Host "Firewall rule already exists: $ruleName"
} else {
  New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5037 `
    -Profile Any -InterfaceAlias "vEthernet (WSL)" -ErrorAction SilentlyContinue | Out-Null
  # Fallback without interface scoping if the WSL vEthernet alias differs:
  if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName `
      -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5037 -Profile Any | Out-Null
  }
  Write-Host "Created firewall rule: $ruleName (TCP 5037 inbound)"
}
