# 6 — Sync, Offline & Saving Changes

The app is **offline-first**. That means it always shows the data already saved on your phone
*instantly*, and talks to the server quietly in the background. You can keep working with no signal —
your changes are queued and sent automatically when you're back online.

This page explains every indicator you might see so you always know the state of your data.

---

## How saving a change actually works

When you update a status or assign a driver:

1. The change is **applied on your phone immediately** (you see it right away).
2. It's added to an **outbox** — a queue of changes waiting to reach the server.
3. If you're online, it's **sent straight away**; if not, it waits.
4. When the server confirms it, the change is marked **done** and your job updates with the server's
   latest data.

This is why the app feels instant even on a poor connection.

---

## The indicators, explained

### Offline banner
A coloured strip at the top of a screen:

> **Offline — showing data from 5 minutes ago**

It means you have no connection and you're looking at your last-saved data. It clears itself when
you reconnect. (If the app has never synced, it reads "Offline — showing saved data.")

### Sync indicator (next to the "Jobs" title)
Quiet by default. It appears only when there's something to report:

| You see… | It means… |
|---|---|
| A small **spinner** | The app is syncing with the server right now. |
| **N pending** badge | N of your changes haven't reached the server yet (e.g. you're offline). They'll send automatically. |
| **N failed** badge (tappable) | N changes were **rejected** by the server and need your attention. Tap it. |

### On a job card
A line on the card itself:
- **↻ Pending sync** — this job has a change waiting to send.
- **⚠ Update failed** — this job's change was rejected (open it to deal with it).

### "Couldn't reach the server"
A thin notice under the tabs on the Jobs screen. The last sync didn't get through. **Pull down to
retry**, or just wait for the next automatic attempt.

---

## When a change fails — the Sync Problems sheet

Tap the **N failed** badge to open **Sync problems**. For each failed change you'll see:

- **What it was** (e.g. "Update status", "Assign driver").
- **Which job** (by reference).
- **A plain-language explanation** of what went wrong, plus the raw server detail underneath.
- **Retry** — try sending it again (useful if it failed due to a temporary glitch).
- **Discard** — give up on the change and drop it.

You can also Retry/Discard from the **red banner inside the job's detail screen**.

> **Why do some changes fail permanently?**
> If the server *rejects* a change — for example, you tried to assign a driver you're not allowed to
> assign, or the job moved on — the app does **not** keep retrying automatically, because retrying
> would just be rejected again. It surfaces the error so you can decide: fix it and retry, or
> discard.
>
> By contrast, changes that fail because you're **offline or the server is briefly unreachable** are
> *not* failures — they stay **pending** and send themselves later.

---

## When does the app sync?

Automatically:
- When you **open the app**.
- When you **pull to refresh** a list.
- **After every change** you make.
- **In the background** when your phone allows it.
- **The moment you reconnect** — it sends your queued changes, then pulls the latest data.

You never *have* to sync manually, but the **Refresh** button (bottom of the Jobs screen) and
pull-to-refresh are there when you want to force it.

---

## Notifications

The app can alert you about **new job assignments and status changes**. It spots these during its
normal background sync and raises a local notification on your phone.

- You'll be asked to **allow notifications** the first time. If you decline, everything still works —
  you just won't get the pop-ups. You can enable them later in your phone's Settings for the app.
- These are on-device alerts; there's nothing to configure on the server.

---

**Next:** [07 — How-To Tasks](07-how-to-tasks.md)
