# 2 — Install on iOS

The app runs on iPhone and iPad. Because it is distributed privately (not on the public App
Store), you'll install it through **TestFlight** or a direct device install.

- **App identifier (bundle ID):** `com.transitteam.app`
- **App name on your home screen:** TQApp
- **iPad supported:** yes

---

## Option A — TestFlight (recommended)

TestFlight is Apple's official app for trying pre-release apps. It handles updates automatically.

1. Install **TestFlight** from the App Store (free, made by Apple).
2. Your administrator sends you an **invitation** — either an email invite or a public link.
   - **Email invite:** open it on your iPhone and tap **View in TestFlight**.
   - **Public link:** open the link on your iPhone; it opens TestFlight.
3. In TestFlight, tap **Accept**, then **Install** next to TQApp.
4. Open the app. You'll land on the **Connect your site** screen —
   continue to [04 — Connecting](04-connecting.md).

> **Updates:** TestFlight notifies you when a new build is ready. Open TestFlight and tap
> **Update**. TestFlight builds expire after 90 days — if the app stops opening with an
> "expired" message, ask your administrator for a fresh invite/build.

---

## Option B — Direct (ad-hoc) install

For a direct install, your device's **UDID must be registered** by your administrator before the
build is made. If it wasn't, the app won't install — use TestFlight instead.

1. Open the install link your administrator sends, **using Safari** on the iPhone.
2. Tap **Install** when prompted; the icon appears on your home screen.
3. **Trust the developer certificate (one-time):**
   - Go to **Settings → General → VPN & Device Management**.
   - Under **Enterprise App / Developer App**, tap your company's profile and tap **Trust**.
4. Open the app from the home screen.

> If you skip step 3, tapping the icon shows an **"Untrusted Developer"** message and the app
> won't launch.

---

## Permissions the app asks for

| Permission | When it's asked | Why |
|---|---|---|
| **Notifications** | First launch / first sign-in | To alert you about new job assignments and status changes. Declining is fine; the app still works. |

The app does **not** request location, camera, contacts, or photo access.

You can change the notification choice later in **Settings → Notifications → TQApp**.

---

**Next:** [04 — Connecting the app to your site](04-connecting.md)
