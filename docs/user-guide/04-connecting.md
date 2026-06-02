# 4 — Connecting the App to Your Site

Connecting is a **one-time** setup per site. After that the app remembers everything and you stay
signed in between launches — no daily re-login.

You'll need three values from your administrator (see [03 — Host Setup](03-host-setup.md)):

- **Site URL** — e.g. `https://couriers.example.com`
- **Client ID**
- **Client Secret**

---

## Step 1 — Connect your site

When you first open the app you land on the **Connect your site** screen.

<img src="images/onboarding.png" alt="Connect your site (onboarding)" width="300" />

1. **Site URL** — type your company's full site address, starting with `https://`.
2. **Client ID** — paste the value from your administrator.
3. **Client Secret** — paste the value from your administrator (it's hidden as you type, like a
   password).
4. Tap **Continue**.

If a value is wrong or the site can't be reached, an error message appears in red just above the
button. Fix the value and tap **Continue** again.

> **Tip:** Copy-paste the Client ID and Secret rather than typing them — they're long and
> case-sensitive. Make sure no stray spaces sneak in at the start or end.

---

## Step 2 — Sign in

After connecting, you reach the **Sign in** screen. The header shows the site you're connecting to,
so you can confirm it's the right one.

<img src="images/login.png" alt="Sign in" width="300" />

1. **Username** — your TransitTeam (WordPress) username.
2. **Password** — your TransitTeam password.
3. Tap **Sign in**.

A wrong username/password shows a clear error. Once you're in, the app downloads your data and
shows your **Jobs** list.

> **Wrong site?** Tap **Change site** at the bottom of the Sign in screen to go back and re-enter
> the Site URL / credentials.

### What happens behind the scenes
Sign-in uses a secure two-step OAuth2 exchange. You won't see it, but it's why the app can keep you
signed in safely without storing your password on the device. Your access token is stored in the
phone's secure storage (Keychain on iOS, Keystore-backed secure store on Android).

---

## Staying signed in

- You **remain signed in** across app restarts and phone reboots.
- You'll only be asked to sign in again if:
  - you **log out** yourself (Profile → Log out), or
  - your session **expires** or is revoked on the server (the app returns you to Sign in and clears
    the stored token automatically).

---

## Adding and switching sites

If your company runs more than one TransitTeam site (e.g. different regions), the app can hold
several and switch between them without re-entering credentials each time.

**To add another site:**
1. Go to **Profile** (link in the top-right of the Jobs screen).
2. Log out, or on the Sign in screen tap **Change site**.
3. Enter the new site's URL + Client ID + Client Secret and sign in.

**To switch between saved sites:**
1. Open **Profile**.
2. Under **Switch site**, tap the site you want.
3. Confirm the switch. The app reloads using that site's data.

The Profile screen always shows your **Active site** at the top so you know which one you're looking
at.

---

## Common connection problems

| Symptom | Likely cause | Fix |
|---|---|---|
| Error on **Continue** | Site URL typo, or `http://` instead of `https://`, or wrong Client ID/Secret | Re-check all three values with your administrator |
| "Couldn't reach the server" | Site not public/HTTPS, or your phone is offline | Confirm you have signal; confirm the site is reachable in a phone browser |
| Sign-in rejected | Wrong username/password, or your account lacks a role | Confirm credentials; ask admin to confirm your role |
| Signed in but **no jobs/screens** you expected | Your role or assignment mode differs from what you assumed | See [05 — Views Reference](05-views-reference.md) |

More in [08 — Troubleshooting & FAQ](08-troubleshooting-faq.md).

---

**Next:** [05 — Views Reference](05-views-reference.md)
