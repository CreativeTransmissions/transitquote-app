# 8 — Troubleshooting & FAQ

Quick answers to the problems people actually hit. If your issue isn't here, note exactly what the
screen says and contact your administrator.

---

## Connecting & signing in

**"Couldn't reach the server" when I tap Continue.**
The Site URL is wrong/unreachable, or the site isn't available over public HTTPS. Check the URL
starts with `https://` and opens in your phone's browser. Confirm the address with your
administrator.

**My Client ID / Secret are rejected.**
They're long and case-sensitive. Copy-paste rather than type, and check for stray spaces at the
start or end. Confirm you were given the credentials for *this* site.

**My username and password are rejected.**
Use your normal TransitTeam (WordPress) login. If it works on the website but not the app, confirm
with your administrator that your account has a role (Driver / Dispatch / administrator).

**I was signed in, but suddenly I'm back at the Sign in screen.**
Your session expired or was revoked on the server. Just sign in again — nothing is lost.

---

## What I can see

**I'm a driver but I don't see an "Available" tab.**
Your team is in **Centralized** mode, so dispatchers assign jobs to you directly. The Available/My
Jobs tabs only appear in **Decentralized** mode.

**I don't see Drivers or Customers links.**
Those are **dispatcher/administrator** only. As a driver you won't see them. (If you *should* be a
dispatcher, ask your administrator to check your role.)

**A screen flashed and bounced me back to Jobs.**
Drivers/Customers screens are dispatcher-only; if you open them without permission the app returns
you to Jobs.

**The job list is empty.**
If filters are active (the Filter button shows a number), tap **Filter → Clear all**. Otherwise pull
down to refresh — you may simply have no jobs in that view.

---

## Data & sync

**It says "showing data from X ago."**
You're offline. You're seeing your last-saved data; it'll refresh when you reconnect.

**My change shows "↻ Pending sync" and isn't updating on the server.**
You're offline or the server is briefly unreachable. The change is queued and will send
automatically. You can force a try with **Refresh** / pull-to-refresh once you have signal.

**My change shows "⚠ Update failed."**
The server **rejected** it. Tap the **failed** badge (or the red banner in the job) to read why,
then **Retry** or **Discard**. See [06 — Sync & Offline](06-sync-and-offline.md).

**An assignment failed.**
Common causes: the chosen driver isn't a valid assignment target, or you don't have permission to
assign to them. The **Sync problems** sheet shows the server's reason.

**Data looks stale / out of date.**
Pull down to refresh, or tap **Refresh**. If you're offline, you'll keep seeing saved data until you
reconnect.

---

## Maps, calls & email

**"Open route in Maps" / a stop doesn't open anything.**
You need a maps app (Google Maps) installed and able to handle the link. If nothing's installed the
app tells you it can't open the link.

**Tapping Phone or Email does nothing.**
You need a phone dialler / email app set up on the device. On tablets without a dialler, calling may
not be available.

---

## Notifications

**I'm not getting notifications.**
You likely declined the permission. Enable it in your phone settings:
- **Android:** Settings → Apps → **TQApp** → Notifications.
- **iOS:** Settings → Notifications → **TQApp**.
Notifications also depend on the app syncing in the background, which the OS may limit to save
battery.

---

## App & install

**(iOS) "Untrusted Developer" when I open the app.**
Trust the profile: Settings → General → VPN & Device Management → your company's profile → **Trust**.
See [02 — Install (iOS)](02-install-ios.md).

**(iOS) TestFlight says the build expired.**
TestFlight builds last 90 days. Ask your administrator for a new build/invite.

**(Android) The .apk won't install.**
Allow installs from the app you're opening it with: Settings → Apps → Special app access → Install
unknown apps. See [01 — Install (Android)](01-install-android.md).

**I need to start completely fresh.**
Log out (Profile → Log out), or reinstall the app. You'll re-enter the site details and sign in
again; no server data is lost — it re-downloads.

---

## Frequently asked

**Do I have to log in every day?**
No. You stay signed in until you log out or your session expires.

**Is my password stored on the phone?**
No. Sign-in uses a secure token kept in the phone's protected storage; your password isn't saved.

**Can I use the app with no signal?**
Yes — that's the whole point. It shows saved data and queues your changes for later.

**Can I be connected to more than one company site?**
Yes. Add each site's details and switch between them from **Profile → Switch site**.

**Why is there no map inside the app?**
By design, routes open in your phone's Google Maps so you use the navigation you already know.

---

← Back to the [User Guide index](README.md)
