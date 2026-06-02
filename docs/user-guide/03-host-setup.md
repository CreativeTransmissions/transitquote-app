# 3 — Host Setup (Administrators)

This section is for the **site owner / administrator** who prepares the WordPress site so staff can
sign in from the mobile app. Drivers and dispatchers don't need to read this — they just need the
three values you produce in [Step 2](#step-2--create-oauth2-api-credentials).

> ⚠️ **About this section.** The mobile app talks to your **TransitTeam / TransitQuote WordPress
> plugin**. That plugin — not the app — owns user accounts, roles, OAuth credentials, and the
> assignment-mode setting. The steps below describe **what the app needs** and the standard place
> each setting lives, but the exact menu names and button positions depend on **your installed
> plugin version**. Where a step says *"verify against your plugin version,"* confirm the wording in
> your own WordPress admin before relying on it.

---

## What the app expects from the server

The app is a client for the **TransitQuote REST API** that ships with the plugin. For staff to use
the app, the server must provide:

1. A reachable **site URL** (the WordPress site address — this becomes the API base).
2. **OAuth2 client credentials** (a Client ID and Client Secret) for that install.
3. **User accounts** with the correct **roles** (Driver, Dispatch, or administrator).
4. An **assignment mode** chosen for the team (Centralized or Decentralized).

---

## Step 1 — Confirm the plugin and API are installed

- Confirm **TransitQuote Pro** and the **TransitTeam** add-on are active in
  **WordPress Admin → Plugins**.
- Confirm the REST API responds. In a browser, the configuration endpoint lives at:
  ```
  https://YOUR-SITE/wp-json/transitquote/v1/configuration
  ```
  (It will return an authentication error until a valid token is supplied — that's expected; you're
  just checking the endpoint exists rather than a 404.)

> The site **must be reachable over HTTPS** from your staff's phones (i.e. a public address, not a
> local-only/dev hostname). Plain `http://` and self-signed dev certificates will not work on real
> devices.

---

## Step 2 — Create OAuth2 API credentials

The app signs in using **OAuth2**. You generate **one** Client ID + Client Secret pair *per
WordPress install*, and **all** staff on that site share the same pair.

- These credentials are **not** user-specific — they identify the *app*, not the person.
- Each individual still signs in with their own WordPress **username and password**; the OAuth
  credentials are entered once during [connection setup](04-connecting.md).
- Generate the pair in the plugin's API / OAuth settings area
  *(location: verify against your plugin version)*.
- Treat the **Client Secret like a password** — share it with staff over a secure channel, not in a
  public post or open chat.

You will hand staff **three values**:

| Value | Example | Notes |
|---|---|---|
| **Site URL** | `https://couriers.example.com` | Your WordPress site address |
| **Client ID** | `a1b2c3…` | Same for everyone on this site |
| **Client Secret** | `x9y8z7…` | Same for everyone; keep it private |

> If you operate **multiple WordPress installs** (e.g. different regions), each install has its own
> URL and its own credential pair. The app supports adding several sites and switching between them
> — see [Multi-site](04-connecting.md#adding-and-switching-sites).

---

## Step 3 — Create users and assign roles

Each person who uses the app needs a WordPress user account with the right role. The app reads the
role from the server and shows the matching screens — **you control access by role, here on the
server.**

| Role | What they get in the app |
|---|---|
| **Driver** | Their own job list; can update job status; in Decentralized mode can claim Available jobs. No Drivers/Customers screens. |
| **Dispatch** | All jobs, all drivers, all customers; can assign jobs to drivers. |
| **administrator** | Same capabilities as Dispatch in the app. |

- Create or edit users in the plugin's driver/dispatcher management area
  *(location: verify against your plugin version)* and/or **WordPress Admin → Users**.
- A **Driver** user is typically linked to a driver record (with phone, email, availability) that
  the app displays.
- Role names are **case-sensitive on the server side** for access decisions — don't invent custom
  role names and expect the app to recognise them.

---

## Step 4 — Choose the assignment mode

Set the team's **job assignment** mode in the plugin's team settings
*(field commonly labelled "Job assignment"; verify against your plugin version)*:

- **Centralized** — dispatchers assign every job; drivers only see what they've been given.
- **Decentralized** — drivers see an **Available** pool and **claim** jobs themselves; the app shows
  drivers two tabs (**Available** / **My Jobs**).

The app reads this setting automatically — there is nothing to configure in the app itself.

---

## Step 5 — Other team settings the app uses

The app pulls these from your team settings and uses them for display (no app-side configuration
needed):

- **Currency** — symbol/code used on the Pricing section of a job.
- **Tax name** (e.g. "VAT") and tax rate — shown on Pricing.
- **Distance unit** (e.g. Mile) and **weight unit** (e.g. kg).
- **Maps** — routes open in the device's native Google Maps via an "Open in Maps" link.

---

## Notifications (no server work required for the default)

Out of the box the app uses **local notifications**: it detects new assignments and status changes
during its normal background sync and raises an alert on the device. **You do not need to configure
push servers, FCM, or APNs** for this to work — staff just need to allow notifications when prompted.

---

## Setup checklist

- [ ] TransitQuote Pro + TransitTeam active; REST API reachable over public HTTPS
- [ ] OAuth2 Client ID + Secret generated for this install
- [ ] Each staff member has a WordPress account with the correct role
- [ ] Assignment mode (Centralized / Decentralized) chosen
- [ ] Currency, tax, and units set in team settings
- [ ] Site URL + Client ID + Client Secret shared securely with staff

---

**Next:** hand staff the three values and point them to
[04 — Connecting the app to your site](04-connecting.md).
