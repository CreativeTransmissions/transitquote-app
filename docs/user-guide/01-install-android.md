# 1 — Install on Android

The app runs on Android phones and tablets. There are two ways to get it, depending on how your
administrator distributes it.

- **App identifier:** `com.transitteam.app`
- **App name on your home screen:** TQApp
- **Orientation:** portrait

---

## Option A — Install the APK file directly (sideload)

Your administrator may send you an installer file ending in **`.apk`** (for example by email,
a download link, or a shared drive). This is the most common way to receive a pre-release build.

1. **Allow installs from your browser / file app (one-time).**
   Android blocks apps from outside the Play Store by default.
   - Open **Settings → Apps → Special app access → Install unknown apps**.
   - Pick the app you'll open the file with (e.g. **Chrome**, **Files**, or **Gmail**) and turn
     on **Allow from this source**.
   - The exact menu wording varies slightly by phone make (Samsung, Pixel, etc.).
2. **Open the `.apk` file** from your downloads or the link.
3. Tap **Install**, then **Open** when it finishes.
4. The first time you open it, you'll land on the **Connect your site** screen —
   continue to [04 — Connecting](04-connecting.md).

> If Android warns that the file "may be harmful," that warning appears for *every* app installed
> outside the Play Store. Only proceed with a file you received from your own administrator.

---

## Option B — Install from an internal distribution link (EAS / Play internal testing)

If your company distributes through **Expo's internal distribution** or **Google Play internal
testing**, your administrator sends you a link instead of a file.

- **EAS internal link:** open the link on the phone, tap **Install**, and approve the
  unknown-sources prompt if asked (same as Option A, step 1).
- **Play internal testing:** tap the opt-in link, accept becoming a tester, then install from the
  **Play Store** page as normal. Updates then arrive automatically through the Play Store.

---

## Permissions the app asks for

| Permission | When it's asked | Why |
|---|---|---|
| **Notifications** | First launch / first sign-in | To alert you about new job assignments and status changes. You can decline; the app still works, you just won't get pop-up alerts. |
| **Network access** | Automatic | To sync with your company's server. |

The app does **not** request location, camera, contacts, or storage permissions.

---

## Updating the app

- **APK (Option A):** install the newer `.apk` over the top — your data and login are kept.
- **Internal/Play (Option B):** updates arrive through the same channel you installed from.

If an update ever fails to open, uninstall and reinstall. You'll need to
[reconnect and sign in](04-connecting.md) again, but no server data is lost.

---

**Next:** [04 — Connecting the app to your site](04-connecting.md)
