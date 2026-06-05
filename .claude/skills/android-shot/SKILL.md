---
name: android-shot
description: Capture a reliable screenshot from the Android emulator for TQApp and view it. Use whenever you need to see the app's current UI, verify a visual change, or produce a screenshot for the user. Avoids the stale/0-byte frames that `adb exec-out screencap` produces on this Windows machine.
---

# android-shot — reliable emulator screenshot

`adb exec-out screencap -p > file.png` returns stale or truncated frames on this machine.
The reliable method is screencap-to-device-file then `adb pull`.

## Capture
```bash
cd C:/Users/andre/AndroidStudioProjects/TQApp; export MSYS_NO_PATHCONV=1; \
adb shell screencap -p /sdcard/shot.png && \
adb pull /sdcard/shot.png "C:/Users/andre/AppData/Local/Temp/tqapp-shot.png" 2>&1 | tail -1
```
- `MSYS_NO_PATHCONV=1` is mandatory — without it Git-Bash rewrites `/sdcard/shot.png` to
  `C:/Program Files/Git/sdcard/shot.png` and the pull fails with `failed to stat remote object`.
- Then **Read** `C:/Users/andre/AppData/Local/Temp/tqapp-shot.png` to view it.

## Tips
- After launching/relaunching the app, `sleep 3`–`4` before capturing so first paint completes.
- To screenshot a specific state, drive it first with `adb shell input tap X Y` /
  `adb shell input text ...`, then capture. Confirm what's focused with
  `adb shell "dumpsys window | grep mCurrentFocus"`.
- Use a unique device-file name per shot (`/sdcard/shot_jobs.png`) and pull to a matching
  Windows temp name so successive captures don't collide or read stale.
- If the pull size looks identical to the previous shot (`stat -c %s`), the screen likely didn't
  change — verify the UI actually updated rather than re-capturing.
