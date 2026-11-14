# SPIKE-001 — PWA feasibility check

**THROWAWAY SPIKE — not product code.** Nothing here is reused in the real app without a separate decision (D-010).

It checks three things on real phones:

- **(a) Storage:** does local data survive a week in an installed home-screen web app?
- **(b) Reminders:** does a calendar `.ics` daily event with an alert actually notify, with no server?
- **(c) Backup:** does export → wipe → import restore the data exactly?

Plain HTML/CSS/JS. No npm, no build step, no external resources. Nothing leaves the device.

## Run locally

```
cd spike/pwa-check
python -m http.server 8000
```

Open the local address shown in the terminal (port 8000) in a desktop browser. Service workers work on localhost; phones need HTTPS (below).

## Owner deploy steps (manual; agents do not deploy)

HTTPS is required to install the app and run its service worker on phones. Simplest free options, browser only:

- **Netlify Drop:** drag the `spike/pwa-check` folder onto app.netlify.com/drop, then claim the site with a free account so it doesn't expire.
- **Or Cloudflare Pages "direct upload".**

Then, on each phone, open the URL:

- **iPhone:** Safari → Share → **Add to Home Screen** → open it from the home screen → **Seed test data**.
- **Android:** Chrome → menu → **Install app** / Add to Home screen → open → **Seed test data**.

Test both platforms; borrow a friend's iPhone if needed. Then tap **Add daily reminder to calendar**, open the downloaded `review-reminder.ics`, and add it to the calendar.

## Results

Fill in [docs/product/SPIKE-001-results.md](../../docs/product/SPIKE-001-results.md).

## Notes

- The icons are plain generated placeholders (purple square, yellow dot).
- The checksum covers the seed record and the 50 items, not the opens log (which changes on every open).
